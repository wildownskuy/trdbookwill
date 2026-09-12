# Feature Extraction — Sesi 1 Features from Tradebook JSON (V2: 30 SHAP Features)
# =========================================================
# UPGRADED: dari 4 fitur → 30 fitur SHAP untuk model ML
# Logika identik dengan extract_master_dataset.py (101.802 data training)
# =========================================================

import sys
import os
import math
from datetime import datetime, date as dt_date

if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False


def get_raw_field(val):
    """Safely extract float from nested raw dict or numeric."""
    if val is None:
        return 0.0
    if isinstance(val, dict):
        r = val.get('raw')
        if isinstance(r, dict):
            return float(r.get('raw', 0.0) or 0.0)
        try:
            return float(r or 0.0)
        except (ValueError, TypeError):
            return 0.0
    try:
        return float(val or 0.0)
    except (ValueError, TypeError):
        return 0.0


def detect_end_s1(times_list: list, require_gap: bool = False) -> int:
    """Deteksi indeks akhir Sesi 1.
    
    1. Iterate timestamps, cari gap > 10 menit antara candle berturut-turut.
    2. Jika ditemukan gap > 10 menit, return indeks candle sebelum gap.
    3. Jika TIDAK ditemukan gap:
       - require_gap True -> return -1
       - require_gap False -> return len(times_list) - 1
    """
    if not times_list:
        return -1
        
    for i in range(1, len(times_list)):
        try:
            h1, m1 = map(int, times_list[i-1].split(':'))
            h2, m2 = map(int, times_list[i].split(':'))
            diff_minutes = (h2 * 60 + m2) - (h1 * 60 + m1)
            if diff_minutes > 10:
                return i - 1
        except (ValueError, IndexError):
            continue
            
    if require_gap:
        return -1
        
    return len(times_list) - 1


def make_5min_candles(prices_list, lots_list):
    """Buat candle 5-menit dari data per-menit S1."""
    candles = []
    bucket = []
    for i in range(len(prices_list)):
        bucket.append((prices_list[i], lots_list[i] if i < len(lots_list) else 0.0))
        if len(bucket) == 5:
            candles.append({
                'o': bucket[0][0],
                'h': max(x[0] for x in bucket),
                'l': min(x[0] for x in bucket),
                'c': bucket[-1][0],
                'v': sum(x[1] for x in bucket)
            })
            bucket = []
    if bucket:
        candles.append({
            'o': bucket[0][0],
            'h': max(x[0] for x in bucket),
            'l': min(x[0] for x in bucket),
            'c': bucket[-1][0],
            'v': sum(x[1] for x in bucket)
        })
    return candles


def extract_features(tradebook_json: dict) -> dict:
    """Ekstrak 30 fitur SHAP dari tradebook JSON untuk model ML.
    
    Logika identik dengan extract_master_dataset.py yang digunakan
    untuk melatih model pada 101.802 data.
    
    Return dict fitur, atau None jika data invalid.
    """
    try:
        data = tradebook_json.get("data", {})
        if not data:
            return None
        
        prices = data.get("prices", [])
        if not prices or len(prices) < 10:
            return None
        
        # Cek data kosong
        import json as _json
        if len(_json.dumps(tradebook_json)) <= 600:
            return None
        
        buy_arr = data.get("buy", [])
        sell_arr = data.get("sell", [])
        bm_buy_arr = data.get("big_money_buy", [])
        bm_sell_arr = data.get("big_money_sell", [])
        net_val_arr = data.get("net_values", [])
        bm_net_val_arr = data.get("big_money_net_values", [])
        net_vol_arr = data.get("net_values_volume", [])
        bm_net_vol_arr = data.get("big_money_net_values_volume", [])
        
        # Build price map
        price_map = {}
        valid_times = []
        for p in prices:
            t = p.get("time")
            v = get_raw_field(p.get("value"))
            if t and v > 0:
                price_map[t] = v
                valid_times.append(t)
        
        if len(valid_times) < 10:
            return None
        
        # Deteksi akhir sesi 1 (gap > 10 menit)
        s1_end_idx = detect_end_s1(valid_times)
        if s1_end_idx == -1:
            return None
        
        times_s1 = valid_times[:s1_end_idx + 1]
        if len(times_s1) < 5:
            return None
        
        close_s1 = price_map[times_s1[-1]]
        
        # Build time-to-index mapping
        time_to_idx = {p.get("time"): i for i, p in enumerate(prices) if p.get("time")}
        last_s1_idx = time_to_idx.get(times_s1[-1], 0)
        
        # === ORDER FLOW & BANDARMOLOGY ===
        buy_lot_s1 = get_raw_field(buy_arr[last_s1_idx].get('lot')) if last_s1_idx < len(buy_arr) else 0.0
        sell_lot_s1 = get_raw_field(sell_arr[last_s1_idx].get('lot')) if last_s1_idx < len(sell_arr) else 0.0
        net_lot_s1 = buy_lot_s1 - sell_lot_s1
        total_lot_s1 = buy_lot_s1 + sell_lot_s1
        buy_ratio_s1 = buy_lot_s1 / total_lot_s1 if total_lot_s1 > 0 else 0.5
        
        bm_buy_lot_s1 = get_raw_field(bm_buy_arr[last_s1_idx].get('lot')) if last_s1_idx < len(bm_buy_arr) else 0.0
        bm_sell_lot_s1 = get_raw_field(bm_sell_arr[last_s1_idx].get('lot')) if last_s1_idx < len(bm_sell_arr) else 0.0
        bm_net_lot_s1 = bm_buy_lot_s1 - bm_sell_lot_s1
        bm_total_lot_s1 = bm_buy_lot_s1 + bm_sell_lot_s1
        bm_buy_ratio_s1 = bm_buy_lot_s1 / bm_total_lot_s1 if bm_total_lot_s1 > 0 else 0.5
        
        net_value_end_s1 = get_raw_field(net_val_arr[last_s1_idx].get('value')) if last_s1_idx < len(net_val_arr) else 0.0
        bm_net_value_end_s1 = get_raw_field(bm_net_val_arr[last_s1_idx].get('value')) if last_s1_idx < len(bm_net_val_arr) else 0.0
        net_vol_end_s1 = get_raw_field(net_vol_arr[last_s1_idx].get('value')) if last_s1_idx < len(net_vol_arr) else 0.0
        bm_net_vol_end_s1 = get_raw_field(bm_net_vol_arr[last_s1_idx].get('value')) if last_s1_idx < len(bm_net_vol_arr) else 0.0
        
        # Build minute-by-minute increments for S1
        min_lots = []
        min_prices = []
        bm_lots = []
        prev_tot = 0.0
        prev_bm = 0.0
        
        for t in times_s1:
            idx = time_to_idx.get(t, 0)
            b = get_raw_field(buy_arr[idx].get('lot')) if idx < len(buy_arr) else 0.0
            s = get_raw_field(sell_arr[idx].get('lot')) if idx < len(sell_arr) else 0.0
            cur_tot = b + s
            d_tot = max(0.0, cur_tot - prev_tot)
            min_lots.append(d_tot)
            prev_tot = cur_tot

            bmb = get_raw_field(bm_buy_arr[idx].get('lot')) if idx < len(bm_buy_arr) else 0.0
            bms = get_raw_field(bm_sell_arr[idx].get('lot')) if idx < len(bm_sell_arr) else 0.0
            cur_bm = bmb + bms
            d_bm = max(0.0, cur_bm - prev_bm)
            bm_lots.append(d_bm)
            prev_bm = cur_bm

            min_prices.append(price_map[t])
        
        n_pts = len(min_lots)
        last30_pts = min_lots[-30:] if n_pts >= 30 else min_lots
        prior_pts = min_lots[:-30] if n_pts > 30 else []
        avg_prior = sum(prior_pts) / len(prior_pts) if prior_pts else 1.0
        avg_last30 = sum(last30_pts) / len(last30_pts) if last30_pts else 1.0
        vol_spike_ratio = avg_last30 / avg_prior if avg_prior > 0 else 1.0
        
        bm_last30_sum = sum(bm_lots[-30:]) if n_pts >= 30 else sum(bm_lots)
        bm_late_share = bm_last30_sum / bm_total_lot_s1 if bm_total_lot_s1 > 0 else 0.0
        
        half = n_pts // 2
        bm_h1 = sum(bm_lots[:half])
        bm_h2 = sum(bm_lots[half:])
        bm_growth_ratio = bm_h2 / bm_h1 if bm_h1 > 0 else (1.0 if bm_h2 == 0 else 2.0)
        
        # === 5-MINUTE CANDLES ===
        candles = make_5min_candles(min_prices, min_lots)
        nc = len(candles)
        if nc == 0:
            return None
        
        s1_open = candles[0]['o']
        s1_high = max(c['h'] for c in candles)
        s1_low = min(c['l'] for c in candles)
        s1_range = s1_high - s1_low if s1_high > s1_low else 1.0
        
        # === ANATOMI CANDLESTICK S1 ===
        s1_body_pct = (close_s1 - s1_open) / s1_open * 100.0 if s1_open > 0 else 0.0
        s1_lower_shadow = (min(s1_open, close_s1) - s1_low) / s1_open * 100.0 if s1_open > 0 else 0.0
        s1_upper_shadow = (s1_high - max(s1_open, close_s1)) / s1_open * 100.0 if s1_open > 0 else 0.0
        s1_close_position = (close_s1 - s1_low) / s1_range
        s1_is_bullish = 1 if close_s1 > s1_open else 0
        
        l6 = candles[-6:] if nc >= 6 else candles
        l6_open = l6[0]['o']
        l6_close = l6[-1]['c']
        l6_high = max(c['h'] for c in l6)
        l6_low = min(c['l'] for c in l6)
        l6_range = l6_high - l6_low if l6_high > l6_low else 1.0
        
        last30_body_pct = (l6_close - l6_open) / l6_open * 100.0 if l6_open > 0 else 0.0
        last30_close_position = (l6_close - l6_low) / l6_range
        
        lc = candles[-1]
        lc_range = lc['h'] - lc['l'] if lc['h'] > lc['l'] else 1.0
        lc_body = abs(lc['c'] - lc['o'])
        last_candle_body_ratio = lc_body / lc_range
        last_candle_lower_shadow = (min(lc['o'], lc['c']) - lc['l']) / lc_range
        last_candle_upper_shadow = (lc['h'] - max(lc['o'], lc['c'])) / lc_range
        
        # === POLA PRICE ACTION ===
        bull_count = sum(1 for c in candles if c['c'] > c['o'])
        bull_candle_ratio = bull_count / nc if nc > 0 else 0.5
        
        marubozu_bear = 1 if (lc['c'] < lc['o'] and last_candle_body_ratio >= 0.85 and last_candle_upper_shadow < 0.08 and last_candle_lower_shadow < 0.08) else 0
        
        inside_bar = 0
        if nc >= 2:
            pc = candles[-2]
            if lc['h'] <= pc['h'] and lc['l'] >= pc['l']:
                inside_bar = 1
        
        # === MOMENTUM & INDIKATOR ===
        closes = [c['c'] for c in candles]
        if len(closes) >= 15:
            diffs = [closes[i] - closes[i-1] for i in range(len(closes)-14, len(closes))]
            g = [d for d in diffs if d >= 0]
            l_list = [abs(d) for d in diffs if d < 0]
            ag = sum(g) / 14.0
            al = sum(l_list) / 14.0
            rs = ag / al if al > 0 else 100.0
            rsi_s1 = 100.0 - (100.0 / (1.0 + rs))
        else:
            rsi_s1 = 50.0
        
        pct_change_s1 = (close_s1 - s1_open) / s1_open * 100.0 if s1_open > 0 else 0.0
        start_last30_price = min_prices[-30] if len(min_prices) >= 30 else min_prices[0]
        momentum_30m_s1 = (close_s1 - start_last30_price) / start_last30_price * 100.0 if start_last30_price > 0 else 0.0
        s1_range_pct = (s1_high - s1_low) / s1_open * 100.0 if s1_open > 0 else 0.0
        
        vol_sum = sum(min_lots)
        pv_sum = sum(p * v for p, v in zip(min_prices, min_lots))
        vwap_s1 = pv_sum / vol_sum if vol_sum > 0 else close_s1
        vwap_dist_pct = (close_s1 - vwap_s1) / vwap_s1 * 100.0 if vwap_s1 > 0 else 0.0
        is_above_vwap = 1 if close_s1 > vwap_s1 else 0
        
        # Bollinger Bandwidth
        bb_window = closes[-20:] if len(closes) >= 20 else closes
        bb_mean = sum(bb_window) / len(bb_window)
        bb_var = sum((x - bb_mean) ** 2 for x in bb_window) / len(bb_window)
        bb_std = math.sqrt(bb_var)
        bb_bandwidth_20 = (4.0 * bb_std / bb_mean * 100.0) if bb_mean > 0 else 0.0
        
        # Price Slope (linear regression)
        if HAS_NUMPY and len(min_prices) > 1:
            x_arr = np.arange(len(min_prices), dtype=np.float64)
            y_arr = np.array(min_prices, dtype=np.float64)
            slope, _ = np.polyfit(x_arr, y_arr, 1)
            price_slope_s1 = (slope / s1_open * 100.0) if s1_open > 0 else 0.0
        elif len(min_prices) > 1:
            n = len(min_prices)
            sx = n * (n - 1) / 2
            sx2 = n * (n - 1) * (2 * n - 1) / 6
            sy = sum(min_prices)
            sxy = sum(i * p for i, p in enumerate(min_prices))
            denom = n * sx2 - sx * sx
            slope = (n * sxy - sx * sy) / denom if denom != 0 else 0
            price_slope_s1 = (slope / s1_open * 100.0) if s1_open > 0 else 0.0
        else:
            price_slope_s1 = 0.0
        
        # Reversal count
        rev_count = 0
        for i in range(2, len(min_prices)):
            d1 = min_prices[i-1] - min_prices[i-2]
            d2 = min_prices[i] - min_prices[i-1]
            if (d1 > 0 and d2 < 0) or (d1 < 0 and d2 > 0):
                rev_count += 1
        
        # === KALENDER ===
        today = dt_date.today()
        weekday = today.weekday()
        
        # === RETURN SEMUA FITUR ===
        features = {
            # Order Flow
            'buy_lot_s1': float(buy_lot_s1),
            'sell_lot_s1': float(sell_lot_s1),
            'net_lot_s1': float(net_lot_s1),
            'buy_ratio_s1': float(buy_ratio_s1),
            'bm_buy_lot_s1': float(bm_buy_lot_s1),
            'bm_sell_lot_s1': float(bm_sell_lot_s1),
            'bm_net_lot_s1': float(bm_net_lot_s1),
            'bm_buy_ratio_s1': float(bm_buy_ratio_s1),
            'net_value_end_s1': float(net_value_end_s1),
            'bm_net_value_end_s1': float(bm_net_value_end_s1),
            'net_vol_end_s1': float(net_vol_end_s1),
            'bm_net_vol_end_s1': float(bm_net_vol_end_s1),
            'vol_spike_ratio': float(vol_spike_ratio),
            'bm_late_share': float(bm_late_share),
            'bm_growth_ratio': float(bm_growth_ratio),
            # Candlestick
            's1_body_pct': float(s1_body_pct),
            's1_lower_shadow': float(s1_lower_shadow),
            's1_upper_shadow': float(s1_upper_shadow),
            's1_close_position': float(s1_close_position),
            's1_is_bullish': int(s1_is_bullish),
            'last30_body_pct': float(last30_body_pct),
            'last30_close_position': float(last30_close_position),
            'last_candle_body_ratio': float(last_candle_body_ratio),
            'last_candle_lower_shadow': float(last_candle_lower_shadow),
            'last_candle_upper_shadow': float(last_candle_upper_shadow),
            # Patterns
            'bull_candle_ratio': float(bull_candle_ratio),
            'marubozu_bear': int(marubozu_bear),
            'inside_bar': int(inside_bar),
            # Momentum
            'rsi_s1': float(rsi_s1),
            'pct_change_s1': float(pct_change_s1),
            'momentum_30m_s1': float(momentum_30m_s1),
            's1_range_pct': float(s1_range_pct),
            'vwap_s1': float(vwap_s1),
            'vwap_dist_pct': float(vwap_dist_pct),
            'is_above_vwap': int(is_above_vwap),
            'bb_bandwidth_20': float(bb_bandwidth_20),
            'price_slope_s1': float(price_slope_s1),
            'reversal_count': int(rev_count),
            # Kalender
            'is_monday': 1 if weekday == 0 else 0,
            'is_tuesday': 1 if weekday == 1 else 0,
            'is_wednesday': 1 if weekday == 2 else 0,
            'is_thursday': 1 if weekday == 3 else 0,
            'is_friday': 1 if weekday == 4 else 0,
            # Metadata (tambahan untuk Supabase, bukan input model)
            'open_s1': round(s1_open, 2),
            'close_s1': round(close_s1, 2),
            'high_s1': round(s1_high, 2),
            'low_s1': round(s1_low, 2),
            'date': today.strftime("%Y-%m-%d"),
            'day_of_week': today.strftime("%A"),
            'freq_s1': nc,
        }
        
        return features
        
    except Exception as e:
        print(f"  [ERROR] Feature extraction error: {e}")
        import traceback
        traceback.print_exc()
        return None


if __name__ == "__main__":
    print("Feature extraction V2 module loaded (30 SHAP features).")
    print("Functions: extract_features(tradebook_json), detect_end_s1(times_list)")