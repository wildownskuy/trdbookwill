# Check-Gap.py — Orkestrasi Gap Check Sesi 2
# =========================================================
# Job: Check-Gap (13:35 Sen-Kam / 14:05 Jumat)
# Referensi: IMPLEMENTATION_PLAN.md Section 7.2
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
from scripts.features import detect_end_s1
from scripts.supabase_client import (
    init_client, get_client, 
    get_pending_watchlist, get_buy_watchlist,
    update_gap as sup_update_gap, update_result as sup_update_result,
    calculate_daily_stats
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


def run_check_gap(job_date: str = None) -> dict:
    """Eksekusi check-gap penuh.
    
    Alur sesuai Section 7.2:
    1. Login Stockbit
    2. Query Supabase: SELECT * FROM screenings WHERE tanggal=today AND entry_decision='PENDING'
    3. Untuk setiap ticker dalam watchlist:
       a. Fetch tradebook hari ini (data sudah termasuk awal S2)
       b. Ambil harga pertama setelah gap (= open S2)
       c. gap_pct = (open_s2 - close_s1) / close_s1 * 100
       d. JIKA gap_pct <= 1.5:
            entry_decision = 'BUY'
            entry_price = open_s2
       e. JIKA gap_pct > 1.5:
            entry_decision = 'SKIP'
       f. Update Supabase
    4. Log: berapa BUY, berapa SKIP
    
    Args:
        job_date: Tanggal trading (YYYY-MM-DD). Jika None, gunakan hari ini.
    
    Return: dict dengan ringkasan eksekusi
    """
    print(f"\n=== GAP-CHECK JOB START ===")
    print(f"Date: {job_date or 'Today'}")
    
    result = {
        "job": "check-gap",
        "date": job_date or datetime.utcnow().strftime("%Y-%m-%d"),
        "total_pending": 0,
        "total_buy": 0,
        "total_skip": 0,
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
        
        # 2. Query screenings PENDING untuk hari ini
        print("\n[2] Querying pending screenings from Supabase...")
        date_str = job_date or datetime.utcnow().strftime("%Y-%m-%d")
        
        pending_rows = get_pending_watchlist(supa, date_str)
        result["total_pending"] = len(pending_rows)
        
        print(f"  Found {len(pending_rows)} pending screenings for {date_str}")
        
        if not pending_rows:
            print("  No pending screenings. All done.")
            return result
        
        # 3. Proses setiap ticker dalam watchlist BUY/SKIP decision
        buy_count = 0
        skip_count = 0
        
        print(f"\n[3] Processing watchlist ({len(pending_rows)} tickers)...")
        
        for i, row in enumerate(pending_rows):
            ticker = row.get('ticker', '')
            close_s1 = row.get('close_s1', 0)
            
            # Refresh token setiap 50 request (rate limit & session expiry)
            if i > 0 and i % 50 == 0:
                print(f"\n  Refreshing token at ticker {i}...")
                token = login(session, username, password, player_id)
                print("  Token refreshed")
            
            try:
                print(f"  [{i+1}/{len(pending_rows)}] {ticker} (close_s1={close_s1})...", end=" ")
                
                # a. Fetch tradebook hari ini (sudah lengkap data S1 + awal S2)
                tradebook = fetch_tradebook_with_retry(session, ticker)
                
                if tradebook is None:
                    print("SKIP (no tradebook data)")
                    skip_count += 1
                    continue
                
                # b. Ambil harga open Sesi 2
                # Cari harga pertama SETELAH gap istirahat (> 10 menit)
                data = tradebook.get("data", {})
                prices = data.get("prices", [])
                times_list = [p.get("time", "") for p in prices if p.get("time")]
                
                price_map_full = {}
                for p in prices:
                    t = p.get("time", "")
                    raw = p.get("value", {}).get("raw") if isinstance(p.get("value"), dict) else None
                    if t and raw is not None:
                        try:
                            price_map_full[t] = float(raw)
                        except ValueError:
                            pass
                
                open_s2 = None
                s1_end_idx = detect_end_s1(times_list)
                if s1_end_idx != -1 and s1_end_idx + 1 < len(times_list):
                    # Harga pertama setelah jeda istirahat adalah awal Sesi 2
                    s2_open_time = times_list[s1_end_idx + 1]
                    open_s2 = price_map_full.get(s2_open_time)
                
                if open_s2 is None:
                    print("Could not detect open_s2 from tradebook after S1 gap")
                    skip_count += 1
                    continue
                
                # c. Hitung gap_pct
                # gap_pct = (open_s2 - close_s1) / close_s1 * 100
                if close_s1 and close_s1 > 0:
                    gap_pct = round((open_s2 - close_s1) / close_s1 * 100, 4)
                else:
                    gap_pct = 0.0
                
                # d. Decision logic
                # JIKA gap_pct <= 1.5: entry_decision = 'BUY', entry_price = open_s2
                # JIKA gap_pct > 1.5: entry_decision = 'SKIP'
                entry_price = None
                if gap_pct <= 1.5:
                    entry_decision = "BUY"
                    entry_price = open_s2
                    buy_count += 1
                    print(f"BUY (gap={gap_pct}% <= 1.5%)")
                else:
                    entry_decision = "SKIP"
                    skip_count += 1
                    print(f"SKIP (gap={gap_pct}% > 1.5%)")
                
                # f. Update Supabase
                sup_update_gap(supa, ticker, date_str, open_s2, gap_pct, entry_decision, entry_price)
                print(f"  Updated DB: decision={entry_decision}")
                
                # 1 detik delay antar request
                if i < len(pending_rows) - 1:
                    time.sleep(1)
                
            except Exception as e:
                error_msg = f"Error processing {ticker}: {e}"
                print(f"  {error_msg}")
                result["errors"].append(error_msg)
                # Lanjut ke ticker berikutnya
                continue
        
        # 4. Log hasil akhir
        print(f"\n=== GAP-CHECK JOB COMPLETE ===")
        print(f"  Total pending: {result['total_pending']}")
        print(f"  BUY decisions: {buy_count}")
        print(f"  SKIP decisions: {skip_count}")
        if result["errors"]:
            print(f"  Errors: {len(result['errors'])}")
        
        result["total_buy"] = buy_count
        result["total_skip"] = skip_count
        return result
        
    except KeyboardInterrupt:
        print("\nGap-check job interrupted by user")
        result["errors"].append("Job interrupted by user")
        return result
    except Exception as e:
        error_msg = f"Fatal gap-check error: {e}"
        print(f"  {error_msg}")
        result["errors"].append(error_msg)
        return result


# Convenience function untuk dijalankan dari command line
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Sistem Gap-Check Sesi 2 BEI")
    parser.add_argument("--date", type=str, help="Tanggal trading (YYYY-MM-DD), default: hari ini")
    args = parser.parse_args()
    
    job_date = args.date if args.date else None
    result = run_check_gap(job_date)
    
    # Print ringkasan
    print(f"\n{'='*50}")
    print("GAP-CHECK RESULT SUMMARY")
    print(f"{'='*50}")
    print(f"Job: {result['job']}")
    print(f"Date: {result['date']}")
    print(f"Total Pending: {result['total_pending']}")
    print(f"BUY decisions: {result['total_buy']}")
    print(f"SKIP decisions: {result['total_skip']}")
    if result["errors"]:
        print(f"Errors: {len(result['errors'])}")
    print("="*50)