# Stockbit API utilities
# =========================================================
# Fungsi-fungsi untuk login, fetch tradebook, dan data saham
# =========================================================

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import sys
import os

# Pastikan encoding UTF-8 untuk Windows
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass


USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"


def create_session() -> requests.Session:
    """Create a requests session with retry strategy."""
    session = requests.Session()
    retry_strategy = Retry(
        total=5,
        backoff_factor=2,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET", "POST"]
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    session.headers.update({
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
        "Accept-Language": "id",
    })
    return session


# Global session and token (cached)
_session = None
_token = None
_token_file = ".stockbit_token"


def login(session: requests.Session, username: str, password: str, player_id: str) -> str:
    """Login to Stockbit and return auth token.
    
    POST https://exodus.stockbit.com/login/v6/username
    Headers: Content-Type: application/json, Accept: application/json, dst.
    Body: {"user": username, "password": password, "player_id": player_id}
    Response path: data.login.token_data.access.token
    """
    global _token
    url = "https://exodus.stockbit.com/login/v6/username"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Language": "ID",
        "Origin": "https://stockbit.com",
        "Referer": "https://stockbit.com/",
        "X-DeviceType": "web",
        "X-Platform": "web",
        "X-AppVersion": "6.0.0",
        "User-Agent": USER_AGENT
    }
    body = {
        "user": username,
        "password": password,
        "player_id": player_id
    }
    try:
        resp = session.post(url, headers=headers, json=body)
        if not resp.ok:
            print(f"Stockbit login response status: {resp.status_code}")
            print(f"Stockbit login response body: {resp.text}")
        resp.raise_for_status()
        data = resp.json()
        _token = data["data"]["login"]["token_data"]["access"]["token"]
        # Cache token ke file
        with open(_token_file, "w") as f:
            f.write(_token)
        return _token
    except Exception as e:
        print(f"Login error: {e}")
        raise


def get_token(session: requests.Session, username: str, password: str, player_id: str) -> str:
    """Get or cached token. Coba baca dari file dulu, kalau gagal login ulang."""
    global _token, _session
    if _token is None:
        try:
            with open(_token_file, "r") as f:
                _token = f.read().strip()
            # Verify token is still valid by making a simple request
            # (akan gagal jika token expired, lalu login ulang)
        except FileNotFoundError:
            _token = login(session, username, password, player_id)
    return _token


def login_if_needed(session: requests.Session, counter: int, username: str, password: str, player_id: str) -> str:
    """Login ulang jika counter % 50 == 0 (rate limit token refresh)."""
    if counter > 0 and counter % 50 == 0:
        print(f"Refresh token at counter {counter}...")
        return login(session, username, password, player_id)
    return get_token(session, username, password, player_id)


def get_top_frequency(session: requests.Session, page: int, username: str, password: str, player_id: str) -> list:
    """Ambil daftar frekuensi dari 1 halaman screener.
    
    POST https://exodus.stockbit.com/screener/templates
    Payload: name="FREQ", ordercol=2, ordertype="desc", filters, universe, page, sequence=3229, dst.
    Return: list of ticker symbols (max 25 per page, 12 pages = 300 total)
    """
    token = login_if_needed(session, page, username, password, player_id)
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Referer": "https://stockbit.com/",
        "Origin": "https://stockbit.com",
        "User-Agent": USER_AGENT
    }
    # Payload sesuai SPEC di IMPLEMENTATION_PLAN.md section 3.2
    body = {
        "name": "FREQ",
        "description": "Freq",
        "ordercol": 2,
        "ordertype": "desc",
        "filters": "[{\"item1\":3229,\"item1_name\":\"Frequency\",\"item2\":\"1\",\"item2_name\":\"\",\"multiplier\":\"0\",\"operator\":\">\",\"type\":\"basic\"}]",
        "universe": "{\"scope\":\"IHSG\",\"scopeID\":\"0\",\"name\":\"IHSG\"}",
        "page": page,
        "sequence": "3229",
        "save": "0",
        "screenerid": "6968836",
        "type": "TEMPLATE_TYPE_CUSTOM"
    }
    url = "https://exodus.stockbit.com/screener/templates"
    resp = session.post(url, headers=headers, json=body)
    resp.raise_for_status()
    data = resp.json()
    calcs = data.get("data", {}).get("calcs", [])
    tickers_with_freq = []
    for c in calcs:
        symbol = c.get("company", {}).get("symbol")
        if not symbol:
            continue
        freq_raw = c.get("results", [{}])[0].get("raw", 0) if c.get("results") else 0
        try:
            freq_val = int(freq_raw)
        except (ValueError, TypeError):
            freq_val = 0
        tickers_with_freq.append((symbol, freq_val))
    return tickers_with_freq


def fetch_tradebook(session: requests.Session, symbol: str, date: str = None) -> dict:
    """Fetch tradebook per saham.
    
    GET https://exodus.stockbit.com/order-trade/trade-book/chart
    Parameters: symbol, time_interval=1m, date (opsional, default hari ini)
    Return: dict raw JSON dari tradebook
    CATATAN: 
    - prices[].value.raw = satu-satunya field harga
    - frequency dan lot di prices selalu null
    - File kosong (<=600 bytes) = tidak ada data trading, SKIP
    - Saat dipanggil jam 12:00, hanya data S1 yang tersedia
    - Saat dipanggil jam 13:35+, data S1 + awal S2 tersedia
    - Saat dipanggil jam 15:50, seluruh data hari tersedia
    """
    global _token
    token = _token
    if not token:
        try:
            with open(_token_file, "r") as f:
                token = f.read().strip()
                _token = token
        except FileNotFoundError:
            pass
    if not token:
        raise RuntimeError("Stockbit auth token not initialized. Call login() first.")

    headers = {
        "Authorization": f"Bearer {token}",
        "accept": "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        "origin": "https://stockbit.com",
        "referer": "https://stockbit.com/",
        "sec-ch-ua-platform": "Windows",
        "x-platform": "web",
        "User-Agent": USER_AGENT
    }
    params = {
        "symbol": symbol,
        "time_interval": "1m",
    }
    if date:
        params["date"] = date
    
    tradebook_url = "https://exodus.stockbit.com/order-trade/trade-book/chart"
    resp = session.get(tradebook_url, headers=headers, params=params)
    if resp.status_code == 401:
        # Token expired, otomatis refresh login
        u = os.environ.get("STOCKBIT_USERNAME", "")
        p = os.environ.get("STOCKBIT_PASSWORD", "")
        pid = os.environ.get("STOCKBIT_PLAYER_ID", "")
        if u and p and pid:
            token = login(session, u, p, pid)
            headers["Authorization"] = f"Bearer {token}"
            resp = session.get(tradebook_url, headers=headers, params=params)
    resp.raise_for_status()
    data = resp.json()
    
    # Check if response is empty ( <= 600 bytes / no data)
    if not data or len(resp.content) <= 600:
        return None  # Empty/no data
    
    return data


def get_current_price(session: requests.Session, symbol: str) -> float:
    """Ambil harga terakhir dari tradebook.
    
    Dari field prices[].value.raw - satu-satunya field harga yang valid.
    """
    tb = fetch_tradebook(session, symbol)
    if tb is None:
        return None
    
    prices = tb.get("data", {}).get("prices", [])
    if not prices:
        return None
    
    # Ambil price terakhir (baris terakhir)
    last_price = prices[-1]
    value = last_price.get("value", {})
    raw = value.get("raw")
    if raw is None:
        return None
    
    try:
        return float(raw)
    except ValueError:
        return None


# Convenience wrapper for screening pipeline
def fetch_tradebook_with_retry(session: requests.Session, symbol: str, max_retries: int = 3) -> dict:
    """Fetch tradebook dengan retry untuk menangani rate limit."""
    for attempt in range(max_retries):
        try:
            result = fetch_tradebook(session, symbol)
            if result is not None:
                return result
            # Jika file kosong, tunggu sebentar dan retry
            if attempt < max_retries - 1:
                import time
                time.sleep(1)  # 1 detik delay antar request (rate limit)
        except Exception as e:
            if attempt < max_retries - 1:
                import time
                time.sleep(1)
            else:
                raise
    return None