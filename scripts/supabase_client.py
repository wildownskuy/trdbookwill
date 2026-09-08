# Supabase Client — Database Operations
# =========================================================
# INSERT/UPDATE ke Supabase PostgreSQL
# Bergantung pada: IMPLEMENTATION_PLAN.md Section 4 (Schema) & Section 10.5
# =========================================================

import sys
import os
from datetime import datetime

# Pastikan encoding UTF-8 untuk Windows
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

# Supabase client - akan di-inisialisasi dengan env variables
# SUPABASE_URL dan SUPABASE_KEY harus di-set sebelum digunakan
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    Client = object
    create_client = None
    print("WARNING: supabase package not installed. Run: pip install supabase")


# Global client
_supabase_client = None


def init_client() -> Client:
    """Inisialisasi client Supabase dari environment variables.
    
    Env variables yang dibutuhkan:
    - SUPABASE_URL: https://xxx.supabase.co
    - SUPABASE_KEY: service key (bukan anon key)
    
    Return: Supabase Client instance
    """
    global _supabase_client
    
    from dotenv import load_dotenv
    # Coba load .env.local jika ada
    load_dotenv(".env.local")
    
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    
    if not url or not key:
        # Fallback: minta user set manual
        print("Error: SUPABASE_URL and SUPABASE_KEY not set in environment")
        print("Please set:")
        print("  export SUPABASE_URL='https://xxx.supabase.co'")
        print("  export SUPABASE_KEY='your-service-key'")
        raise ValueError("Supabase credentials not configured")
    
    _supabase_client = create_client(url, key)
    print(f"Supabase client initialized: {url}")
    return _supabase_client


def get_client() -> Client:
    """Ambil client Supabase yang sudah diinisialisasi."""
    global _supabase_client
    if _supabase_client is None:
        return init_client()
    return _supabase_client


# --- Screening Table Operations ---

def upsert_screening(client: Client, row: dict) -> None:
    """Upsert (insert atau update) data screening ke tabel screenings.
    
    Kolom yang diisi sesuai schema di IMPLEMENTATION_PLAN.md section 4:
    - id, tanggal, ticker, hari, is_friday
    - open_s1, close_s1, high_s1, low_s1, rsi_s1, s1_body_pct, vol_spike_ratio
    - bull_candle_ratio, freq_s1
    - rule1_match, rule2_match, rule3_match
    - open_s2, gap_pct, entry_decision, entry_price
    - close_s2, profit_pct, result
    - created_at, updated_at
    
    Args:
        client: Supabase Client yang sudah diinisialisasi
        row: dict berisi semua kolom nilai
    """
    try:
        # Pastikan ada unique constraint (tanggal, ticker)
        result = client.table("screenings").upsert(row, on_conflict="tanggal,ticker").execute()
        return result
    except Exception as e:
        print(f"Error upsert_screening: {e}")
        raise


def get_pending_watchlist(client: Client, date: str) -> list:
    """Ambil watchlist yang masih PENDING untuk tanggal tertentu.
    
    Query: SELECT * FROM screenings WHERE tanggal=today AND entry_decision='PENDING'
    
    Return: list of dict dari screenings yang match belum punya keputusan
    """
    try:
        result = client.table("screenings").select("*").eq("tanggal", date).eq("entry_decision", "PENDING").execute()
        return result.data if result else []
    except Exception as e:
        print(f"Error getting pending watchlist: {e}")
        return []


def get_buy_watchlist(client: Client, date: str) -> list:
    """Ambil watchlist dengan entry_decision='BUY' untuk tanggal tertentu.
    
    Query: SELECT * FROM screenings WHERE tanggal=today AND entry_decision='BUY'
    
    Return: list of dict dari screenings yang sudah decided BUY
    """
    try:
        result = client.table("screenings").select("*").eq("tanggal", date).eq("entry_decision", "BUY").execute()
        return result.data if result else []
    except Exception as e:
        print(f"Error getting buy watchlist: {e}")
        return []


def update_gap(client: Client, ticker: str, date: str, open_s2: float, 
                gap_pct: float, decision: str, entry_price: float) -> None:
    """Update kolom gap & entry decision setelah check-gap job.
    
    Args:
        client: Supabase Client
        ticker: symbol saham
        date: tanggal trading
        open_s2: harga open Sesi 2
        gap_pct: persentase gap (float)
        decision: 'BUY' atau 'SKIP'
        entry_price: harga entry (biasanya open_s2 untuk BUY)
    """
    try:
        result = client.table("screenings").update({
            "open_s2": open_s2,
            "gap_pct": gap_pct,
            "entry_decision": decision,
            "entry_price": entry_price,
            "updated_at": datetime.utcnow().isoformat() + "Z"
        }).eq("ticker", ticker).eq("tanggal", date).execute()
        return result
    except Exception as e:
        print(f"Error updating gap for {ticker}: {e}")
        raise


def update_result(client: Client, ticker: str, date: str, close_s2: float, 
                  profit_pct: float, result_str: str) -> None:
    """Update kolom evaluasi (close_s2, profit_pct, result) setelah evaluate job.
    
    Args:
        client: Supabase Client
        ticker: symbol saham
        date: tanggal trading
        close_s2: harga close Sesi 2
        profit_pct: profit percentage (float)
        result_str: 'WIN', 'LOSS', atau 'FLAT'
    """
    try:
        resp = client.table("screenings").update({
            "close_s2": close_s2,
            "profit_pct": profit_pct,
            "result": result_str,
            "updated_at": datetime.utcnow().isoformat() + "Z"
        }).eq("ticker", ticker).eq("tanggal", date).execute()
        return resp
    except Exception as e:
        print(f"Error updating result for {ticker}: {e}")
        raise


def get_last_cumulative(client: Client, before_date: str = None) -> dict:
    """Ambil statistik kumulatif terakhir dari tabel daily_stats sebelum tanggal tertentu.
    
    Query: SELECT * FROM daily_stats WHERE tanggal < before_date ORDER BY tanggal DESC LIMIT 1
    
    Return: dict statistik terakhir atau None jika belum ada data
    """
    try:
        query = client.table("daily_stats").select("*")
        if before_date:
            query = query.lt("tanggal", before_date)
        result = query.order("tanggal", desc=True).limit(1).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error getting last cumulative: {e}")
        return None


def update_daily_stats(client: Client, date: str, stats: dict) -> None:
    """Update/INSERT ke tabel daily_stats dengan statistik harian & kumulatif.
    
    Args:
        client: Supabase Client
        date: tanggal trading (YYYY-MM-DD format)
        stats: dict berisi statistik lengkap (lihat Section 8 di IMPLEMENTATION_PLAN.md)
            - total_screened: int
            - total_rule1_match: int
            - total_buy: int
            - total_skip: int
            - total_win: int
            - total_loss: int
            - total_flat: int
            - win_rate_harian: float
            - avg_profit_harian: float
            - cum_total_trades: int
            - cum_total_wins: int
            - cum_profit_sum: float
            - win_rate_all_time: float
            - avg_profit_all_time: float
    """
    try:
        # Pastikan tanggal dalam format yang benar
        if isinstance(date, str):
            # Coba parse ke date object
            from datetime import datetime
            date_obj = datetime.strptime(date, "%Y-%m-%d").date()
        else:
            date_obj = date
        
        stats_with_date = {
            "tanggal": date_obj.isoformat(),
            **stats  # Spread semua stats lainnya
        }
        
        result = client.table("daily_stats").upsert(stats_with_date, on_conflict="tanggal").execute()
        return result
    except Exception as e:
        print(f"Error updating daily stats: {e}")
        raise


# --- Helper functions for win-rate calculation ---

def calculate_daily_stats(client: Client, date: str) -> dict:
    """Hitung statistik harian dari screenings tabel.
    
    Dijalankan setelah evaluate (15:50 WIB) seperti Section 8 di IMPLEMENTATION_PLAN.md.
    
    Return: dict dengan statistik harian
    """
    try:
        # 1. Hitung statistik hari ini
        all_today = client.table("screenings").select("*").eq("tanggal", date).execute()
        all_data = all_today.data or []
        total_screened = len(all_data)
        total_rule1_match = sum(1 for s in all_data if s.get('rule1_match'))
        total_skip = sum(1 for s in all_data if s.get('entry_decision') == 'SKIP')
        
        buy_data = [s for s in all_data if s.get('entry_decision') == 'BUY']
        day_trades = len(buy_data)
        day_wins = sum(1 for s in buy_data if s.get('result') == 'WIN')
        day_losses = sum(1 for s in buy_data if s.get('result') == 'LOSS')
        day_flat = sum(1 for s in buy_data if s.get('result') == 'FLAT')
        day_profit = sum(float(s.get('profit_pct', 0) or 0) for s in buy_data)
        
        win_rate_harian = (day_wins / day_trades * 100) if day_trades > 0 else 0
        avg_profit_harian = (day_profit / day_trades) if day_trades > 0 else 0
        
        # 2. Baca kumulatif terakhir sebelum tanggal ini
        last = get_last_cumulative(client, before_date=date)
        cum_total_trades = (last['cum_total_trades'] if last else 0) + day_trades
        cum_total_wins = (last['cum_total_wins'] if last else 0) + day_wins
        cum_profit_sum = (last['cum_profit_sum'] if last else 0) + day_profit
        
        # 3. Hitung all-time
        win_rate_all_time = (cum_total_wins / cum_total_trades * 100) if cum_total_trades > 0 else 0
        avg_profit_all_time = (cum_profit_sum / cum_total_trades) if cum_total_trades > 0 else 0
        
        stats = {
            "total_screened": total_screened,
            "total_rule1_match": total_rule1_match,
            "total_buy": day_trades,
            "total_skip": total_skip,
            "total_win": day_wins,
            "total_loss": day_losses,
            "total_flat": day_flat,
            "win_rate_harian": round(win_rate_harian, 4),
            "avg_profit_harian": round(avg_profit_harian, 4),
            "cum_total_trades": cum_total_trades,
            "cum_total_wins": cum_total_wins,
            "cum_profit_sum": round(cum_profit_sum, 4),
            "win_rate_all_time": round(win_rate_all_time, 4),
            "avg_profit_all_time": round(avg_profit_all_time, 4),
        }
        
        # Simpan hasil kalkulasi ke tabel daily_stats
        try:
            update_daily_stats(client, date, stats)
        except Exception as save_err:
            print(f"Warning: Failed to persist daily_stats for {date}: {save_err}")

        return stats
    except Exception as e:
        print(f"Error calculating daily stats: {e}")
        raise


# Test manual jika dijalankan langsung
if __name__ == "__main__":
    print("Supabase client module loaded.")
    print("Functions available:")
    print("  - init_client() - Initialize Supabase client")
    print("  - upsert_screening(client, row) - Insert/update screening")
    print("  - get_pending_watchlist(client, date) - Get PENDING watchlist")
    print("  - get_buy_watchlist(client, date) - Get BUY watchlist")
    print("  - update_gap(client, ticker, date, open_s2, gap_pct, decision, entry_price)")
    print("  - update_result(client, ticker, date, close_s2, profit_pct, result)")
    print("  - get_last_cumulative(client) - Get last daily_stats")
    print("  - update_daily_stats(client, date, stats) - Update daily_stats")
    print("  - calculate_daily_stats(client, date) - Calculate daily stats")
    print("\nNote: Set env vars SUPABASE_URL and SUPABASE_KEY before running.")