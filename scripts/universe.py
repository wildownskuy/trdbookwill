# Universe Builder — Top Frequency Screener
# =========================================================
# Build daftar 300 saham top-frequency dari 12 halaman screener
# =========================================================

import sys
import os

# Pastikan encoding UTF-8 untuk Windows
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

# Pastikan project root masuk ke sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.stockbit_api import create_session, get_top_frequency, login_if_needed


def build_universe(session=None, max_pages: int = 12, username: str = "", password: str = "", player_id: str = ""):
    """Build universum top-frequency dari 12 halaman screener.
    
    Fungsi ini:
    1. Jika session belum diberikan, buat session baru
    2. Loop page 1..max_pages (default 12), panggil get_top_frequency
    3. Retry hingga 3x jika terjadi 401 atau network error dengan re-login otomatis
    4. Deduplikasi dan pertahankan urutan frekuensi tertinggi (maks 300 ticker)
    5. Jika satu page gagal setelah 3x retry, lanjutkan page berikutnya
    
    Return: tuple(list of ticker symbols, dict of ticker -> frequency)
    """
    if session is None:
        session = create_session()
    
    u = username or os.environ.get("STOCKBIT_USERNAME", "")
    p = password or os.environ.get("STOCKBIT_PASSWORD", "")
    pid = player_id or os.environ.get("STOCKBIT_PLAYER_ID", "")
    
    all_tickers = []
    freq_map = {}
    seen = set()
    import time
    
    for page in range(1, max_pages + 1):
        print(f"Fetching page {page}...", flush=True)
        tickers_with_freq = None
        
        # Retry up to 3 times per page
        for attempt in range(1, 4):
            try:
                tickers_with_freq = get_top_frequency(session, page, u, p, pid)
                break
            except Exception as err:
                print(f"  [Attempt {attempt}/3] Page {page} error: {err}. Re-logging in and retrying...", flush=True)
                time.sleep(1.5 * attempt)
                if u and p and pid:
                    try:
                        from scripts.stockbit_api import login
                        login(session, u, p, pid)
                    except Exception:
                        pass
        
        if tickers_with_freq:
            for symbol, freq in tickers_with_freq:
                if symbol not in seen:
                    seen.add(symbol)
                    all_tickers.append(symbol)
                    freq_map[symbol] = freq
            print(f"Page {page}: {len(tickers_with_freq)} tickers, total unique: {len(all_tickers)}", flush=True)
        else:
            print(f"  [WARNING] Page {page} failed after 3 attempts, continuing with {len(all_tickers)} accumulated tickers...", flush=True)
        
        # Small delay untuk rate limit Stockbit (1 detik)
        time.sleep(1)
    
    if len(all_tickers) == 0:
        raise RuntimeError("Failed to build universe: 0 tickers fetched from all pages.")
    
    # Pertahankan urutan ranking frekuensi dan batasi ke 300 teratas
    all_tickers = all_tickers[:300]
    
    print(f"\nUniversum built: {len(all_tickers)} unique tickers (max 300)", flush=True)
    return all_tickers, freq_map


if __name__ == "__main__":
    # Bisa dijalankan manual untuk test
    # Butuh credentials: username, password, player_id
    print("Usage: import this module and call build_universe(session, username, password, player_id)")
    print("Atau setup environment variables: STOCKBIT_USERNAME, STOCKBIT_PASSWORD, STOCKBIT_PLAYER_ID")