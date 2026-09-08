// viewmodels/useHistory.js
// React Hook untuk history table - menampilkan riwayat screening per tanggal
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useHistory(date = null) {
    const [state, setState] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        async function fetchHistory() {
            setLoading(true);
            try {
                let query = supabase
                    .from('screenings')
                    .select('*')
                    .order('updated_at', { ascending: false });

                // Jika date bukan 'ALL', filter berdasarkan tanggal tertentu
                if (date && date !== 'ALL') {
                    query = query.eq('tanggal', date);
                } else if (!date) {
                    const todayStr = new Date().toISOString().split('T')[0];
                    query = query.eq('tanggal', todayStr);
                }

                const { data, error } = await query;

                if (error) throw error;

                if (data && !cancelled) {
                    const rows = data.map((row) => ({
                        tanggal: row.tanggal,
                        ticker: row.ticker,
                        entry_decision: row.entry_decision,
                        entry_price: row.entry_price ?? null,
                        gap_pct: row.gap_pct ?? null,
                        result: row.result ?? null,
                        profit_pct: row.profit_pct ?? null,
                        // Fitur teknikal S1
                        freq_s1: row.freq_s1 ?? null,
                        rsi_s1: row.rsi_s1 ?? null,
                        s1_body_pct: row.s1_body_pct ?? null,
                        close_s1: row.close_s1 ?? null,
                        open_s1: row.open_s1 ?? null,
                        open_s2: row.open_s2 ?? null,
                        close_s2: row.close_s2 ?? null,
                        vol_spike_ratio: row.vol_spike_ratio ?? null,
                        bull_candle_ratio: row.bull_candle_ratio ?? null,
                        // Metadata
                        created_at: row.created_at,
                        updated_at: row.updated_at ?? null,
                    }));
                    setState(rows);
                }
            } catch (err) {
                console.error('History fetch error:', err);
                if (!cancelled) {
                    setError(err.message || 'Unknown error');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        fetchHistory();

        return () => {
            cancelled = true;
        };
    }, [date]);

    return { state, loading, error };
}