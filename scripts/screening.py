# Screening.py — Orkestrasi Screening Sesi 1
# =========================================================
# Job: Screening (12:00 Sen-Kam / 11:30 Jumat)
# Referensi: IMPLEMENTATION_PLAN.md Section 7.1
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

from scripts.stockbit_api import create_session, get_top_frequency, fetch_tradebook_with_retry, login_if_needed, login
from scripts.features import extract_features
from scripts.rules import apply_rule1, apply_rule2, apply_rule3
from scripts.supabase_client import (
    init_client, get_client, upsert_screening, 
    get_pending_watchlist, get_buy_watchlist,
    update_gap, update_result, calculate_daily_stats
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


def run_screening(job_date: str = None) -> dict:
    """Eksekusi screening penuh.
    
    Alur sesuai Section 7.1:
    1. Login Stockbit -> dapatkan token
    2. Loop page 1..12 pada endpoint screener "FREQ": kumpulkan semua ticker (maks 300)
    3. Untuk setiap ticker (i = 0..299):
       a. Jika i > 0 dan i % 50 == 0 -> LOGIN ULANG (refresh token)
       b. Fetch tradebook: GET /order-trade/trade-book/chart?symbol={ticker}&time_interval=1m
       c. Jika response kosong (<=600 bytes atau prices kosong) -> SKIP
       d. Deteksi akhir sesi 1 (cari gap > 10 menit di timestamps)
       e. Buat candle 5-menit dari data per-menit sesi 1
       f. Hitung fitur: rsi_s1, s1_body_pct, vol_spike_ratio, bull_candle_ratio
       g. Apply Rule 1:
          - Jika match -> upsert ke Supabase screenings (entry_decision='PENDING')
          - Jika tidak match -> skip (tidak disimpan, ATAU simpan tanpa rule1_match)
    4. Log: total discan, total match rule
    
    Args:
        job_date: Tanggal trading (YYYY-MM-DD). Jika None, gunakan hari ini.
    
    Return: dict dengan ringkasan eksekusi
    """
    print(f"\n=== SCREENING JOB START ===")
    print(f"Date: {job_date or 'Today'}")
    print(f"Timestamp: {datetime.now().isoformat() if False else 'N/A'}")
    
    result = {
        "job": "screening",
        "date": job_date or datetime.now().strftime("%Y-%m-%d"),
        "total_scanned": 0,
        "total_matched_rule1": 0,
        "total_skipped": 0,
        "total_saved": 0,
        "errors": []
    }
    
    try:
        session = get_session()
        supa = get_supabase()
        
        # 1. Login otentikasi (dapatkan token pertama kalinya)
        print("\n[1] Logging in to Stockbit...")
        # Ambil credentials dari environment
        username = os.environ.get("STOCKBIT_USERNAME", "")
        password = os.environ.get("STOCKBIT_PASSWORD", "")
        player_id = os.environ.get("STOCKBIT_PLAYER_ID", "")
        
        if not all([username, password, player_id]):
            print("WARNING: Stockbit credentials not set in environment variables")
            result["errors"].append("Missing Stockbit credentials")
            return result
        
        try:
            token = login(session, username, password, player_id)
            print(f"  Login successful, token acquired")
        except Exception as e:
            print(f"  Login failed: {e}")
            result["errors"].append(f"Login failed: {e}")
            return result
        
        # 2. Build universum (top 300 frekuensi)
        print("\n[2] Building universe (top-frequency)...")
        try:
            universe, freq_map = build_universe(session, max_pages=12, username=username, password=password, player_id=player_id)
        except Exception as e:
            print(f"  Universe build error: {e}")
            result["errors"].append(f"Universe build error: {e}")
            return result
        
        result["total_scanned"] = len(universe)
        print(f"  Universum: {len(universe)} tickers (max 300)")
        
        # 3. Proses setiap ticker
        print(f"\n[3] Processing {len(universe)} tickers...")
        match_count = 0
        skip_count = 0
        saved_count = 0
        
        for i, ticker in enumerate(universe):
            try:
                # a. Login ulang setiap 50 ticker (rate limit refresh)
                if i > 0 and i % 50 == 0:
                    print(f"  Refreshing token at ticker {i}...")
                    token = login(session, username, password, player_id)
                    print(f"  Token refreshed")
                
                # b. Fetch tradebook per ticker
                print(f"  [{i+1}/{len(universe)}] Fetching tradebook for {ticker}...", end=" ")
                tradebook = fetch_tradebook_with_retry(session, ticker)
                
                if tradebook is None:
                    print("SKIP (empty/no data)")
                    skip_count += 1
                    result["total_skipped"] += 1
                    continue
                
                # c. Extract features dan apply rule
                print("Extracting features...", end=" ")
                features = extract_features(tradebook)
                
                if features is None:
                    print("SKIP (feature extraction failed)")
                    skip_count += 1
                    result["total_skipped"] += 1
                    continue
                
                # d. Apply Rule 1
                rule1_result = apply_rule1(features)
                
                if rule1_result:
                    print("MATCH Rule 1!")
                    match_count += 1
                    result["total_matched_rule1"] += 1
                    
                    # e. Upsert ke Supabase dengan entry_decision='PENDING'
                    row = {
                        "tanggal": features.get('date', job_date or datetime.utcnow().strftime("%Y-%m-%d")),
                        "ticker": ticker,
                        "hari": features.get('day_of_week', ''),
                        "is_friday": features.get('is_friday', False),
                        
                        # Fitur Sesi 1
                        "open_s1": features.get('open_s1', 0),
                        "close_s1": features.get('close_s1', 0),
                        "high_s1": features.get('high_s1', 0),
                        "low_s1": features.get('low_s1', 0),
                        "rsi_s1": features.get('rsi_s1', 0),
                        "s1_body_pct": features.get('s1_body_pct', 0),
                        "vol_spike_ratio": features.get('vol_spike_ratio', 0),
                        "bull_candle_ratio": features.get('bull_candle_ratio', 0),
                        "freq_s1": freq_map.get(ticker, features.get('freq_s1', 0)),
                        
                        # Rule match
                        "rule1_match": True,
                        "rule2_match": False,  # Akan di-set jika dibutuhkan
                        "rule3_match": False,  # Akan di-set jika dibutuhkan
                        
                        # Gap & Entry (belum diisi, akan di-update oleh check-gap job)
                        "open_s2": None,
                        "gap_pct": None,
                        "entry_decision": "PENDING",
                        "entry_price": None,
                        
                        # Evaluasi (belum diisi, akan di-update oleh evaluate job)
                        "close_s2": None,
                        "profit_pct": None,
                        "result": "PENDING",
                        
                        # Metadata
                        "created_at": datetime.utcnow().isoformat() + "Z",
                        "updated_at": datetime.utcnow().isoformat() + "Z",
                    }
                    
                    # Validasi unik constraint
                    try:
                        upsert_screening(supa, row)
                        saved_count += 1
                        result["total_saved"] += 1
                        print(f"  Saved to DB")
                    except Exception as e:
                        print(f"  DB save error: {e}")
                        result["errors"].append(f"DB error for {ticker}: {e}")
                else:
                    # Rule 1 tidak match - boleh skip atau simpan tanpa rule1_match
                    # Menurut spec: "Jika tidak match -> skip (tidak disimpan, ATAU simpan tanpa rule1_match)"
                    # Kita skip saja untuk menghemat space DB
                    skip_count += 1
                    result["total_skipped"] += 1
                    print(f"  No match Rule 1 (skipping)")
                
                # 1 detik delay antar request (rate limit Stockbit)
                if i < len(universe) - 1:
                    time.sleep(1)
                
            except Exception as e:
                error_msg = f"Error processing {ticker} at index {i}: {e}"
                print(f"  {error_msg}")
                result["errors"].append(error_msg)
                # Lanjut ke ticker berikutnya
                continue
        
        # 4. Log hasil akhir
        print(f"\n=== SCREENING JOB COMPLETE ===")
        print(f"  Total scanned: {result['total_scanned']}")
        print(f"  Rule 1 matched: {match_count}")
        print(f"  Skipped (no match / empty data): {skip_count}")
        print(f"  Saved to DB: {saved_count}")
        if result["errors"]:
            print(f"  Errors: {len(result['errors'])}")
        
        return result
        
    except KeyboardInterrupt:
        print("\nScreening job interrupted by user")
        result["errors"].append("Job interrupted by user")
        return result
    except Exception as e:
        error_msg = f"Fatal screening error: {e}"
        print(f"  {error_msg}")
        result["errors"].append(error_msg)
        return result


def build_universe(session, max_pages: int = 12, username: str = "", password: str = "", player_id: str = ""):
    """Helper: build universum dari 12 halaman screener."""
    from scripts.universe import build_universe as bu
    return bu(session, max_pages, username, password, player_id)


# Convenience function untuk dijalankan dari command line
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Sistem Screening Sesi 1 BEI")
    parser.add_argument("--date", type=str, help="Tanggal trading (YYYY-MM-DD), default: hari ini")
    args = parser.parse_args()
    
    job_date = args.date if args.date else None
    result = run_screening(job_date)
    
    # Print ringkasan
    print(f"\n{'='*50}")
    print("SCREENING RESULT SUMMARY")
    print(f"{'='*50}")
    print(f"Job: {result['job']}")
    print(f"Date: {result['date']}")
    print(f"Total Scanned: {result['total_scanned']}")
    print(f"Rule 1 Matches: {result['total_matched_rule1']}")
    print(f"Skipped: {result['total_skipped']}")
    print(f"Saved to DB: {result['total_saved']}")
    if result["errors"]:
        print(f"Errors: {len(result['errors'])}")
    print("="*50)