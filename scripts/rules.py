# Trading Rules — Apply Rule 1/2/3 from Analysis
# =========================================================
# Rule definitions based on rules_terbaik.py and IMPLEMENTATION_PLAN.md Section 6
# Dataset: 1.117 data (602 naik / 515 tidak naik), baseline 53.9%
# =========================================================

import sys
import os

# Pastikan encoding UTF-8 untuk Windows
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass


def apply_rule1(feats: dict) -> bool:
    """Rule 1 — Win Rate Tertinggi (UTAMA, yang dipakai)"""
    rsi = feats.get('rsi_s1')
    if rsi is None: rsi = 100.0
    vol = feats.get('vol_spike_ratio')
    if vol is None: vol = 0.0
    body = feats.get('s1_body_pct')
    if body is None: body = 100.0
    
    result = (
        rsi <= 71.43 and
        vol > 1.50 and
        body <= 6.48
    )
    return result


def apply_rule2(feats: dict) -> bool:
    """Rule 2 — Sample Terbanyak (cadangan)"""
    rsi = feats.get('rsi_s1')
    if rsi is None: rsi = 100.0
    body = feats.get('s1_body_pct')
    if body is None: body = 100.0
    bull = feats.get('bull_candle_ratio')
    if bull is None: bull = 0.0
    
    result = (
        rsi <= 71.43 and
        body <= 6.48 and
        bull > 0
    )
    return result


def apply_rule3(feats: dict) -> bool:
    """Rule 3 — Paling Simpel (cadangan)"""
    rsi = feats.get('rsi_s1')
    if rsi is None: rsi = 100.0
    body = feats.get('s1_body_pct')
    if body is None: body = 100.0
    
    result = (
        rsi <= 71.43 and
        body <= 7.14
    )
    return result


# Convenience function to apply all rules
def apply_all_rules(feats: dict) -> dict:
    """Apply all three rules and return match status.
    
    Return: dict with keys rule1_match, rule2_match, rule3_match (bool)
    """
    return {
        'rule1_match': apply_rule1(feats),
        'rule2_match': apply_rule2(feats),
        'rule3_match': apply_rule3(feats),
    }


# Test manual
if __name__ == "__main__":
    print("Rules module loaded.")
    print("Functions: apply_rule1(feats), apply_rule2(feats), apply_rule3(feats), apply_all_rules(feats)")
    
    # Quick test with sample data
    test_feats = {
        'rsi_s1': 70.0,
        'vol_spike_ratio': 1.55,
        's1_body_pct': 5.5,
        'bull_candle_ratio': 0.6
    }
    
    print(f"\nTest feats: {test_feats}")
    print(f"Rule 1 match: {apply_rule1(test_feats)} (expected: True)")
    print(f"Rule 2 match: {apply_rule2(test_feats)} (expected: True)")
    print(f"Rule 3 match: {apply_rule3(test_feats)} (expected: True)")