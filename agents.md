# Agent Instructions -- tradebook-live-test

## Konteks
Sistem live-testing prediksi Sesi 2 BEI.
Rule utama (Rule 1): RSI_S1 <= 71.43 AND vol_spike_ratio > 1.50 AND s1_body_pct <= 6.48
Win-rate historis: 83.8% (validated time-split).

## Jadwal
- Sen-Kam: screening 12:00, gap-check 13:35, evaluate 15:50 WIB
- Jumat: screening 11:30, gap-check 14:05, evaluate 15:50 WIB

## API Stockbit
- LOGIN: POST /login/v6/username
- UNIVERSE: POST /screener/templates (payload "FREQ", page 1-12, item_id 3229)
- TRADEBOOK: GET /order-trade/trade-book/chart?symbol=X&time_interval=1m

Token refresh setiap 50 ticker.

## Catatan
- Deteksi akhir S1: gap > 10 menit di timestamps. JANGAN hardcode jam.
- prices[].value.raw = harga. frequency dan lot di prices selalu null.
- net_values = KUMULATIF, bukan delta per menit.
- Frontend: Next.js Pages Router + Tailwind CSS v3 + MVVM.
- Database: Supabase PostgreSQL. Retraining ML: di-skip saat ini.