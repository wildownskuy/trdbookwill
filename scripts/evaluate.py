# Evaluate.py — Orkestrasi Evaluasi & Update Win-Rate
# =========================================================
# Job: Evaluate (15:50 setiap hari kerja)
# Referensi: IMPLEMENTATION_PLAN.md Section 7.3 & Section 8
# =========================================================

import sys
import os
import time
import requests
from datetime import datetime

# Pastikan encoding UTF-8 untuk Windows
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

from dotenv import load_dotenv
load_dotenv(".env.local")
load_dotenv(".env")

# Import modul dalam proyek ini (arahkan ke project root)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.stockbit_api import create_session, fetch_tradebook_with_retry, login
from scripts.supabase_client import (
    init_client, get_client,
    get_buy_watchlist, get_last_cumulative,
    update_result as sup_update_result,
    update_daily_stats, calculate_daily_stats
)

# Global variables
_session = None
_supabase = None


def get_session() -> requests.Session:
    """Membuat session HTTP dengan retry strategy."""
    global _session
    if _session is None:
        _session = create_session()
    return _session


def get_supabase() -> any:
    """Mendapatkan Supabase client."""
    global _supabase
    if _supabase is None:
        _supabase = init_client()
    return _supabase


def run_evaluate(job_date: str = None) -> dict:
    """Eksekusi evaluate penuh.
    
    Alur sesuai Section 7.3:
    1. Login Stockbit
    2. Query Supabase: SELECT * FROM screenings WHERE tanggal=today AND entry_decision='BUY'
    3. Untuk setiap ticker:
       a. Fetch tradebook hari ini (sudah lengkap sampai 15:49)
       b. close_s2 = harga pada jam 15:49 (atau harga terakhir)
       c. profit_pct = (close_s2 - entry_price) / entry_price * 100
       d. result = 'WIN' jika > 0, 'LOSS' jika < 0, 'FLAT' jika = 0
       e. Update Supabase screenings
    4. Hitung statistik harian & kumulatif (lihat Section 8)
    5. INSERT INTO daily_stats
    6. Log: statistik lengkap
    
    Args:
        job_date: Tanggal trading (YYYY-MM-DD). Jika None, gunakan hari ini.
    
    Return: dict dengan ringkasan eksekusi lengkap
    """
    print(f"\n=== EVALUATE JOB START ===")
    print(f"Date: {job_date or 'Today'}")
    
    result = {
        "job": "evaluate",
        "date": job_date or datetime.now().strftime("%Y-%m-%d"),
        "total_buy": 0,
        "total_wins": 0,
        "total_losses": 0,
        "total_flat": 0,
        "total_screened": 0,
        "win_rate_harian": 0,
        "avg_profit_harian": 0,
        "cum_total_trades": 0,
        "cum_total_wins": 0,
        "cum_profit_sum": 0,
        "win_rate_all_time": 0,
        "avg_profit_all_time": 0,
        "errors": []
    }
    
    try:
        session = get_session()
        supa = get_supabase()
        
        # 1. Login Stockbit
        print("\n[1] Logging in to Stockbit...")
        username = os.environ.get("STOCKBIT_USERNAME", "")
        password = os.environ.get("STOCKBIT_PASSWORD", "")
        player_id = os.environ.get("STOCKBIT_PLAYER_ID", "")
        
        if not all([username, password, player_id]):
            print("WARNING: Stockbit credentials not set")
            result["errors"].append("Missing Stockbit credentials")
            return result
        
        try:
            token = login(session, username, password, player_id)
            print(f"  Login successful")
        except Exception as e:
            print(f"  Login failed: {e}")
            result["errors"].append(f"Login failed: {e}")
            return result
        
        # 2. Query screenings BUY untuk hari ini
        print("\n[2] Querying BUY watchlist from Supabase...")
        date_str = job_date or datetime.now().strftime("%Y-%m-%d")
        
        buy_rows = get_buy_watchlist(supa, date_str)
        result["total_buy"] = len(buy_rows)
        
        print(f"  Found {len(buy_rows)} BUY screenings for {date_str}")
        
        if not buy_rows:
            print("  No BUY screenings. Nothing to evaluate.")
            # Still hitung daily stats dari data sebelumnya
            print("  Calculating daily stats from existing data...")
            daily_stats = calculate_daily_stats(supa, date_str)
            result.update(daily_stats)
            return result
        
        # 3. Proses setiap ticker BUY
        day_wins = 0
        day_losses = 0
        day_flat = 0
        day_profit = 0.0
        
        print(f"\n[3] Evaluating {len(buy_rows)} tickers...")
        
        for i, row in enumerate(buy_rows):
            ticker = row.get('ticker', '')
            entry_price = row.get('entry_price', 0)
            
            # Refresh token setiap 50 request (rate limit & session expiry)
            if i > 0 and i % 50 == 0:
                print(f"\n  Refreshing token at ticker {i}...")
                token = login(session, username, password, player_id)
                print("  Token refreshed")
            
            try:
                print(f"  [{i+1}/{len(buy_rows)}] {ticker} (entry={entry_price})...", end=" ", flush=True)
                
                # Cek apakah sudah pernah dievaluasi sebelumnya (resume capability)
                if row.get('result') in ['WIN', 'LOSS', 'FLAT'] and row.get('close_s2') is not None and row.get('close_s2') > 0:
                    res_val = row.get('result')
                    prof_val = float(row.get('profit_pct') or 0)
                    print(f"[ALREADY EVALUATED] {res_val} (profit={prof_val}%)", flush=True)
                    if res_val == 'WIN': day_wins += 1
                    elif res_val == 'LOSS': day_losses += 1
                    else: day_flat += 1
                    day_profit += prof_val
                    continue
                
                # a. Fetch tradebook hari ini (sudah lengkap sampai 15:49)
                tradebook = fetch_tradebook_with_retry(session, ticker)
                
                if tradebook is None:
                    print("SKIP (no tradebook data)")
                    # Set default result as FLAT jika tidak ada data
                    sup_update_result(supa, ticker, date_str, 0, 0.0, "FLAT")
                    day_flat += 1
                    result["total_screened"] += 1
                    if i < len(buy_rows) - 1:
                        time.sleep(1)
                    continue
                
                # b. Ambil close_s2 = harga pada jam 15:49 atau harga terakhir
                data = tradebook.get("data", {})
                prices = data.get("prices", [])
                
                # Cari price pada jam 15:49 atau price terakhir
                close_s2 = None
                
                # Dari IMPLEMENTATION_PLAN.md: "close_s2 = harga pada jam 15:49 (atau harga terakhir)"
                # Cari price dengan time terendah atau terakhir
                for p in reversed(prices):  # Dari belakang (terakhir)
                    value = p.get("value", {})
                    raw = value.get("raw") if isinstance(value, dict) else None
                    if raw is not None:
                        try:
                            close_s2 = float(raw)
                            break
                        except ValueError:
                            continue
                
                # Jika tidak ditemukan di prices, coba nilai lain
                if close_s2 is None:
                    # Coba ambil dari net_values atau field lain
                    close_s2 = 0.0  # Default
                
                # c. Hitung profit_pct
                # profit_pct = (close_s2 - entry_price) / entry_price * 100
                if entry_price and entry_price > 0:
                    profit_pct = round((close_s2 - entry_price) / entry_price * 100, 4)
                else:
                    profit_pct = 0.0
                
                # d. Determine result
                # result = 'WIN' jika > 0, 'LOSS' jika < 0, 'FLAT' jika = 0
                if profit_pct > 0:
                    result_str = "WIN"
                    day_wins += 1
                elif profit_pct < 0:
                    result_str = "LOSS"
                    day_losses += 1
                else:
                    result_str = "FLAT"
                    day_flat += 1
                
                day_profit += profit_pct
                
                # e. Update Supabase
                sup_update_result(supa, ticker, date_str, close_s2, profit_pct, result_str)
                print(f"{result_str} (profit={profit_pct}%)", flush=True)
                
                # 1 detik delay antar request (rate limit)
                if i < len(buy_rows) - 1:
                    time.sleep(1)
                
            except Exception as e:
                error_msg = f"Error evaluating {ticker}: {e}"
                print(f"  {error_msg}")
                result["errors"].append(error_msg)
                # Lanjut ke ticker berikutnya
                continue
        
        # 4. Hitung statistik harian & kumulatif (Section 8)
        print("\n[4] Calculating statistics...")
        daily_stats = calculate_daily_stats(supa, date_str)
        
        # Salin hasil ke result
        result["win_rate_harian"] = daily_stats.get("win_rate_harian", 0)
        result["avg_profit_harian"] = daily_stats.get("avg_profit_harian", 0)
        result["cum_total_trades"] = daily_stats.get("cum_total_trades", 0)
        result["cum_total_wins"] = daily_stats.get("cum_total_wins", 0)
        result["cum_profit_sum"] = daily_stats.get("cum_profit_sum", 0)
        result["win_rate_all_time"] = daily_stats.get("win_rate_all_time", 0)
        result["avg_profit_all_time"] = daily_stats.get("avg_profit_all_time", 0)
        
        # 5. INSERT INTO daily_stats (sudah dilakukan di calculate_daily_stats)
        # Fungsi ini sudah melakukan upsert ke daily_stats
        
        # 6. Log hasil akhir
        print(f"\n=== EVALUATE JOB COMPLETE ===")
        print(f"  Total BUY: {result['total_buy']}")
        print(f"  Wins: {day_wins}")
        print(f"  Losses: {day_losses}")
        print(f"  Flat: {day_flat}")
        print(f"  Win Rate Harian: {result['win_rate_harian']:.2f}%")
        print(f"  Avg Profit Harian: {result['avg_profit_harian']:.4f}%")
        print(f"  All-Time Win Rate: {result['win_rate_all_time']:.2f}%")
        print(f"  Cumulative Trades: {result['cum_total_trades']}")
        if result["errors"]:
            print(f"  Errors: {len(result['errors'])}")
        
        return result
        
    except KeyboardInterrupt:
        print("\nEvaluate job interrupted by user")
        result["errors"].append("Job interrupted by user")
        return result
    except Exception as e:
        error_msg = f"Fatal evaluate error: {e}"
        print(f"  {error_msg}")
        result["errors"].append(error_msg)
        return result


def login(session, username, password, player_id):
    """Helper: login ke Stockbit."""
    from scripts.stockbit_api import login as do_login
    return do_login(session, username, password, player_id)


# Convenience function untuk dijalankan dari command line
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Sistem Evaluasi & Win-Rate")
    parser.add_argument("--date", type=str, help="Tanggal trading (YYYY-MM-DD), default: hari ini")
    args = parser.parse_args()
    
    job_date = args.date if args.date else None
    result = run_evaluate(job_date)
    
    # Print ringkasan
    print(f"\n{'='*50}")
    print("EVALUATE RESULT SUMMARY")
    print(f"{'='*50}")
    print(f"Job: {result['job']}")
    print(f"Date: {result['date']}")
    print(f"Total BUY (to evaluate): {result['total_buy']}")
    print(f"Wins: {result['total_wins'] if 'total_wins' in result else 'N/A'}")
    print(f"Losses: {result['total_losses'] if 'total_losses' in result else 'N/A'}")
    print(f"Flat: {result['total_flat'] if 'total_flat' in result else 'N/A'}")
    print(f"Win Rate Harian: {result['win_rate_harian']:.2f}%")
    print(f"Avg Profit Harian: {result['avg_profit_harian']:.4f}%")
    print(f"All-Time Win Rate: {result['win_rate_all_time']:.2f}%")
    print(f"Cumulative Trades: {result['cum_total_trades']}")
    print(f"Cumulative Profit Sum: {result['cum_profit_sum']:.4f}")
    if result["errors"]:
        print(f"Errors: {len(result['errors'])}")
    print("="*50)