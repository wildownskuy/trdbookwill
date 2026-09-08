# Feature Extraction — Sesi 1 Features from Tradebook JSON
# =========================================================
# Extract features from Stockbit tradebook data for Sesi 1 BEI
# Based on: IMPLEMENTATION_PLAN.md Section 5 & Rules Terbaik
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


def detect_end_s1(times_list: list) -> int:
    """Deteksi indeks akhir Sesi 1.
    
    Iterate timestamps, cari gap > 10 menit antara candle berturut-mendatang.
    Jadwal BEI konsisten:
    - Sen-Kam: S1 = 09:00-11:59, S2 = 13:30-15:49
    - Jumat: S1 = 09:00-11:29, S2 = 14:00-15:49
    
    Return: index of close_s1 (0-based), or -1 if not found
    """
    for i in range(1, len(times_list)):
        try:
            # Parse time format "HH:MM"
            h1, m1 = map(int, times_list[i-1].split(':'))
            h2, m2 = map(int, times_list[i].split(':'))
            diff_minutes = (h2 * 60 + m2) - (h1 * 60 + m1)
            if diff_minutes > 10:
                return i - 1
        except (ValueError, IndexError):
            continue
    return -1


def make_5min_candles(price_map: dict, times_s1: list, lot_map: dict) -> list:
    """Buat candle 5-menit dari data per-menit Sesi 1.
    
    Menggabungkan 5 candle 1-menit menjadi 1 candle 5-menit.
    Setiap candle memiliki: o (open), h (high), l (low), c (close), v (volume), t (time)
    
    Args:
        price_map: dict {time: price} dari prices[].value.raw
        times_s1: list of time strings dari sesi 1
        lot_map: dict {time: lot} dari buy/sell lot
    
    Return: list of candle dicts
    """
    candles = []
    bucket = []
    
    for t in times_s1:
        p = price_map.get(t)
        if p is None:
            continue
        bucket.append((t, p, lot_map.get(t, 0)))
        if len(bucket) == 5:
            # Buat candle 5-menit
            candle = {
                'o': bucket[0][1],  # open = price pertama di bucket
                'h': max(b[1] for b in bucket),  # high = max price di bucket
                'l': min(b[1] for b in bucket),  # low = min price di bucket
                'c': bucket[-1][1],  # close = price terakhir di bucket
                'v': sum(b[2] for b in bucket),  # volume = total lot di bucket
                't': bucket[0][0]  # time = time candle pertama
            }
            candles.append(candle)
            bucket = []
    
    # Sisa candle (kurang dari 5) tetap ditambahkan
    if bucket:
        candle = {
            'o': bucket[0][1],
            'h': max(b[1] for b in bucket),
            'l': min(b[1] for b in bucket),
            'c': bucket[-1][1],
            'v': sum(b[2] for b in bucket),
            't': bucket[0][0]
        }
        candles.append(candle)
    
    return candles


def calc_rsi(candles: list, period: int = 14) -> float:
    """Hitung RSI 14 periode dari candle 5-menit.
    
    Formula: 100 - (100 / (1 + RS))
    RS = avg_gain / avg_loss dari period candle terakhir
    
    Jika data kurang dari period + 1 candle, return 50.0 (netral).
    """
    closes_arr = [c['c'] for c in candles]
    if len(closes_arr) < period + 1:
        return 50.0
    
    gains = []
    losses = []
    
    # Ambil period diff dari candle terakhir
    for i in range(1, period + 1):
        diff = closes_arr[-(period - i + 2)] - closes_arr[-(period - i + 1)]
        if diff >= 0:
            gains.append(diff)
        else:
            losses.append(abs(diff))
    
    avg_gain = sum(gains) / period if gains else 0
    avg_loss = sum(losses) / period if losses else 0
    
    if avg_loss == 0:
        return 100.0
    
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return round(rsi, 4)


def calc_body_pct(open_s1: float, close_s1: float) -> float:
    """Hitung body percentage: (close_s1 - open_s1) / open_s1 * 100"""
    if open_s1 == 0:
        return 0.0
    return round((close_s1 - open_s1) / open_s1 * 100, 4)


def calc_vol_spike_ratio(candles: list) -> float:
    """Hitung vol_spike_ratio: avg volume 30 menit terakhir / rata-rata sebelumnya.
    
    Jika len(candles) >= 6:
    - avg_vol = rata-rata volume candle 0 sampai -6 (30 menit sebelum)
    - last_vol = rata-rata volume candle terakhir 5 menit
    - vol_spike_ratio = last_vol / avg_vol jika avg_vol > 0, else 1
    """
    if len(candles) < 6:
        return 1.0
    
    # 30 menit terakhir = 6 candle 5-menit sebelum candle terakhir
    prev_candles = candles[:-6]
    last_candles = candles[-6:]
    
    if not prev_candles:
        return 1.0
    
    avg_vol = sum(c['v'] for c in prev_candles) / max(len(prev_candles), 1)
    last_vol = sum(c['v'] for c in last_candles) / 6
    
    if avg_vol > 0:
        ratio = last_vol / avg_vol
    else:
        ratio = 1.0
    
    return round(ratio, 4)


def calc_bull_candle_ratio(candles: list) -> float:
    """Hitung bull_candle_ratio: jumlah candle bullish / total candle sesi 1."""
    if not candles:
        return 0.0
    bullish = sum(1 for c in candles if c['c'] > c['o'])
    return round(bullish / len(candles), 4)


def extract_features(tradebook_json: dict) -> dict:
    """Ekstraksi semua fitur dari tradebook JSON.
    
    Langkah-langkah:
    1. Parse prices, buy, sell dari tradebook
    2. Deteksi akhir sesi 1 (gap > 10 menit)
    3. Buat candle 5-menit dari data sesi 1
    4. Hitung semua fitur: rsi_s1, s1_body_pct, vol_spike_ratio, bull_candle_ratio
    5. Return dict fitur, atau None jika data invalid
    
    CATATAN PENTING (dari IMPLEMENTATION_PLAN.md):
    - prices[].value.raw = satu-satunya field harga
    - frequency dan lot di prices selalu null
    - File kosong (<=600 bytes) = SKIP (return None)
    - net_values = KUMULATIF, bukan delta per menit
    - Deteksi akhir S1: gap > 10 menit di timestamps, JANGAN hardcode jam
    """
    try:
        data = tradebook_json.get("data", {})
        if not data:
            return None
        
        prices = data.get("prices", [])
        buy = data.get("buy", [])
        sell = data.get("sell", [])
        
        # Check for empty/data kosong
        # File kosong <= 600 bytes = SKIP
        import json
        json_str = json.dumps(tradebook_json)
        if len(json_str) <= 600:
            print("  [SKIP] Tradebook file too small (<=600 bytes)")
            return None
        
        # Build price map dan lot map dari buy/sell
        price_map = {}
        lot_map = {}
        
        # Dari prices - hanya value.raw yang valid
        for p in prices:
            t = p.get("time", "")
            v = p.get("value", {})
            raw = v.get("raw") if isinstance(v, dict) else None
            if t and raw is not None:
                try:
                    price_map[t] = float(raw)
                except ValueError:
                    pass
        
        # Dari buy/sell - ambil lot dan JUMLAHKAN volume (buy + sell)
        for b in buy:
            t = b.get("time", "")
            lot_raw = b.get("lot", {}).get("raw") if isinstance(b.get("lot"), dict) else None
            if t and lot_raw is not None:
                try:
                    lot_map[t] = lot_map.get(t, 0.0) + float(lot_raw)
                except ValueError:
                    pass
        
        for s in sell:
            t = s.get("time", "")
            lot_raw = s.get("lot", {}).get("raw") if isinstance(s.get("lot"), dict) else None
            if t and lot_raw is not None:
                try:
                    lot_map[t] = lot_map.get(t, 0.0) + float(lot_raw)
                except ValueError:
                    pass
        
        # Ambil times list dari prices
        times_list = [p.get("time", "") for p in prices if p.get("time")]
        
        if not times_list or not price_map:
            print("  [SKIP] No price data available")
            return None
        
        # 1. Deteksi akhir Sesi 1
        s1_end_idx = detect_end_s1(times_list)
        if s1_end_idx == -1:
            print("  [SKIP] Could not detect end of Sesi 1 (no gap > 10 min)")
            return None
        
        # Ambil data hingga akhir S1
        s1_times = times_list[:s1_end_idx + 1]
        
        # 2. Buat candle 5-menit
        candles = make_5min_candles(price_map, s1_times, lot_map)
        
        if len(candles) < 2:
            print("  [SKIP] Not enough data for 5-min candles (need >= 2)")
            return None
        
        # 3. Hitung fitur dasar dari candle
        # Ambil candle terakhir sebagai representasi close_s1
        last_candle = candles[-1]
        close_s1 = last_candle['c']
        
        # Open Sesi 1 adalah price pada timestamp pertama
        first_time = s1_times[0] if s1_times else None
        open_s1 = price_map.get(first_time, last_candle['o']) if first_time else last_candle['o']
        
        s1_body_pct = calc_body_pct(open_s1, close_s1)
        
        rsi_s1 = calc_rsi(candles)
        vol_spike_ratio = calc_vol_spike_ratio(candles)
        bull_candle_ratio = calc_bull_candle_ratio(candles)
        
        # Ambil harga S1 (open, close, high, low)
        # Dari semua candle 5-menit S1
        all_opens = [c['o'] for c in candles]
        all_closes = [c['c'] for c in candles]
        all_highs = [c['h'] for c in candles]
        all_lows = [c['l'] for c in candles]
        
        # Gunakan close_s1 dari candle terakhir (ini sesuai definisi fitur)
        close_s1_price = close_s1
        open_s1_price = open_s1
        
        high_s1 = max(all_highs)
        low_s1 = min(all_lows)
        
        # Tanggal dan hari
        from datetime import date as dt_date
        today = dt_date.today()

        # Fitur lengkap
        features = {
            # Fitur Sesi 1 dasar
            'open_s1': round(open_s1_price, 2),
            'close_s1': round(close_s1_price, 2),
            'high_s1': round(high_s1, 2),
            'low_s1': round(low_s1, 2),
            
            # Fitur dari analysis
            'rsi_s1': rsi_s1,
            's1_body_pct': s1_body_pct,
            'vol_spike_ratio': vol_spike_ratio,
            'bull_candle_ratio': bull_candle_ratio,
            
            # Metadata & Kalender
            'date': today.strftime("%Y-%m-%d"),
            'day_of_week': today.strftime("%A"),
            'is_friday': today.weekday() == 4,
            'freq_s1': len(candles),
            'times_analyzed': len(times_list),
            
            # Pola candle tambahan (dari features_merged.csv format)
            's1_is_bullish': 1 if close_s1 > open_s1 else 0,
            'last30_is_bullish': 1 if (candles and candles[-1]['c'] > candles[-1]['o']) else 0,
        }
        
        return features
        
    except Exception as e:
        print(f"  [ERROR] Feature extraction error: {e}")
        import traceback
        traceback.print_exc()
        return None


# Test manual jika dijalankan langsung
if __name__ == "__main__":
    print("Feature extraction module loaded.")
    print("Functions available: extract_features(), detect_end_s1(), make_5min_candles(), calc_body_pct()")
    print("Trading rules logic is located in scripts/rules.py")