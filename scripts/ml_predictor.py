# ML Predictor — Load trained LightGBM model and predict
# =========================================================
# Model: LightGBM Top 30 SHAP features, Optuna-tuned
# Trained on: 101,802 samples (Jan 2025 - Sep 2026)
# Validated: 5-fold Walk-Forward CV, WR 80.75% at threshold 0.85
# =========================================================

import sys
import os

if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

import joblib
import numpy as np

# Path ke model file
_MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'models')
_MODEL_PATH = os.path.join(_MODEL_DIR, 'lgb_top30_tuned.joblib')

# Cached model
_model_data = None


def _load_model():
    """Load model dari file joblib. Cache setelah load pertama."""
    global _model_data
    if _model_data is not None:
        return _model_data
    
    if not os.path.exists(_MODEL_PATH):
        raise FileNotFoundError(f"Model file not found: {_MODEL_PATH}")
    
    _model_data = joblib.load(_MODEL_PATH)
    print(f"  [ML] Model loaded: {_MODEL_PATH}")
    print(f"  [ML] Features: {len(_model_data['features'])} | Threshold: {_model_data['threshold']}")
    return _model_data


def predict_naik(features: dict, threshold: float = None) -> tuple:
    """Prediksi apakah saham akan naik di Sesi 2.
    
    Args:
        features: dict fitur dari extract_features()
        threshold: probability threshold (default dari model: 0.85)
    
    Returns:
        tuple: (is_buy: bool, probability: float)
        - is_buy: True jika proba >= threshold
        - probability: probabilitas naik (0.0 - 1.0)
    """
    try:
        data = _load_model()
        model = data['model']
        feature_names = data['features']
        if threshold is None:
            threshold = data.get('threshold', 0.85)
        
        # Build feature array dalam urutan yang benar
        X = np.array([[features.get(f, 0.0) for f in feature_names]], dtype=np.float32)
        
        # Predict probability
        proba = model.predict_proba(X)[0, 1]
        is_buy = bool(proba >= threshold)
        
        return is_buy, float(proba)
    
    except FileNotFoundError:
        print("  [ML] WARNING: Model not found, returning (False, 0.0)")
        return False, 0.0
    except Exception as e:
        print(f"  [ML] ERROR predicting: {e}")
        return False, 0.0


def get_model_info() -> dict:
    """Return model metadata."""
    try:
        data = _load_model()
        return {
            'features': data['features'],
            'n_features': len(data['features']),
            'threshold': data.get('threshold', 0.85),
            'n_train': data.get('n_train', 0),
            'baseline_wr': data.get('baseline_wr', 0),
        }
    except:
        return {'error': 'Model not loaded'}


if __name__ == "__main__":
    print("ML Predictor module loaded.")
    info = get_model_info()
    print(f"Model info: {info}")
    
    # Quick test with dummy data
    dummy = {f: 0.0 for f in info.get('features', [])}
    is_buy, proba = predict_naik(dummy)
    print(f"Dummy test: is_buy={is_buy}, proba={proba:.4f}")
