# Trading Rules — Rule Definitions (V2: ML + GA + Legacy)
# =========================================================
# Rule 1-3: Legacy rules (dari dataset 1.117 sampel)
# Rule GA: Genetic Algorithm rule (dari dataset 101.802 sampel, p<0.0001)
# ML Predict: LightGBM model (WR 80.75%, threshold 0.85)
# =========================================================

import sys
import os

if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass


def apply_rule_ml(feats: dict, threshold: float = 0.85) -> tuple:
    """Rule ML — LightGBM Top 30 SHAP (UTAMA)
    
    WR 80.75% validated (5-fold walk-forward, 553 sinyal, 5/5 fold signifikan)
    
    Returns:
        tuple: (is_buy: bool, probability: float)
    """
    try:
        from scripts.ml_predictor import predict_naik
        return predict_naik(feats, threshold=threshold)
    except ImportError:
        print("  [WARN] ml_predictor not available, falling back to GA rule")
        return apply_rule_ga(feats), 0.0
    except Exception as e:
        print(f"  [WARN] ML prediction error: {e}, falling back to GA rule")
        return apply_rule_ga(feats), 0.0


def apply_rule_ga(feats: dict) -> bool:
    """Rule GA — Genetic Algorithm (FALLBACK)
    
    WR 69.14% (n=81 OOS test, p<0.0001, statistik signifikan)
    Ditemukan dari 101.802 data, validated walk-forward.
    Overfit gap hanya 4.72 poin persentase.
    """
    return (
        feats.get('s1_body_pct', 999) <= 4.3956 and
        feats.get('s1_upper_shadow', 999) <= 6.2757 and
        feats.get('price_slope_s1', -999) > 0.0023 and
        feats.get('reversal_count', 999) <= 10.0 and
        feats.get('buy_ratio_s1', 0) > 0.5595 and
        feats.get('marubozu_bear', 0) > 0.0
    )


# === LEGACY RULES (dari dataset lama 1.117 sampel) ===

def apply_rule1(feats: dict) -> bool:
    """Rule 1 Legacy — Win Rate Tertinggi (dataset lama)"""
    rsi = feats.get('rsi_s1')
    if rsi is None: rsi = 100.0
    vol = feats.get('vol_spike_ratio')
    if vol is None: vol = 0.0
    body = feats.get('s1_body_pct')
    if body is None: body = 100.0
    
    return (
        rsi <= 71.43 and
        vol > 1.50 and
        body <= 6.48
    )


def apply_rule2(feats: dict) -> bool:
    """Rule 2 Legacy — Sample Terbanyak (cadangan)"""
    rsi = feats.get('rsi_s1')
    if rsi is None: rsi = 100.0
    body = feats.get('s1_body_pct')
    if body is None: body = 100.0
    bull = feats.get('bull_candle_ratio')
    if bull is None: bull = 0.0
    
    return (
        rsi <= 71.43 and
        body <= 6.48 and
        bull > 0
    )


def apply_rule3(feats: dict) -> bool:
    """Rule 3 Legacy — Paling Simpel (cadangan)"""
    rsi = feats.get('rsi_s1')
    if rsi is None: rsi = 100.0
    body = feats.get('s1_body_pct')
    if body is None: body = 100.0
    
    return (
        rsi <= 71.43 and
        body <= 7.14
    )


def apply_all_rules(feats: dict) -> dict:
    """Apply all rules and return match status."""
    ml_buy, ml_proba = apply_rule_ml(feats)
    return {
        'ml_match': ml_buy,
        'ml_proba': ml_proba,
        'ga_match': apply_rule_ga(feats),
        'rule1_match': apply_rule1(feats),
        'rule2_match': apply_rule2(feats),
        'rule3_match': apply_rule3(feats),
    }


if __name__ == "__main__":
    print("Rules V2 module loaded.")
    print("Primary: apply_rule_ml(feats) -> (bool, float)")
    print("Fallback: apply_rule_ga(feats) -> bool")
    print("Legacy: apply_rule1/2/3(feats) -> bool")