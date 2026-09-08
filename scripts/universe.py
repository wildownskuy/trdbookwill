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
    3. Deduplikasi dan pertahankan urutan frekuensi tertinggi (maks 300 ticker)
    
    Return: tuple(list of ticker symbols, dict of ticker -> frequency)
    """
    if session is None:
        session = create_session()
    
    all_tickers = []
    freq_map = {}
    seen = set()
    
    for page in range(1, max_pages + 1):
        print(f"Fetching page {page}...")
        tickers_with_freq = get_top_frequency(session, page, username, password, player_id)
        
        for symbol, freq in tickers_with_freq:
            if symbol not in seen:
                seen.add(symbol)
                all_tickers.append(symbol)
                freq_map[symbol] = freq
        
        print(f"Page {page}: {len(tickers_with_freq)} tickers, total unique: {len(all_tickers)}")
        
        # Small delay untuk rate limit Stockbit (1 detik)
        import time
        time.sleep(1)
    
    # Pertahankan urutan ranking frekuensi dan batasi ke 300 teratas
    all_tickers = all_tickers[:300]
    
    print(f"\nUniversum built: {len(all_tickers)} unique tickers (max 300)")
    return all_tickers, freq_map


if __name__ == "__main__":
    # Bisa dijalankan manual untuk test
    # Butuh credentials: username, password, player_id
    print("Usage: import this module and call build_universe(session, username, password, player_id)")
    print("Atau setup environment variables: STOCKBIT_USERNAME, STOCKBIT_PASSWORD, STOCKBIT_PLAYER_ID")