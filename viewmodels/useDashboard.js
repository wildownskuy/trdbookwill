// viewmodels/useDashboard.js
// React Hook untuk dashboard - MVVM pattern
// Mengambil data dari Supabase dan auto-refresh setiap 60 detik
// =========================================================

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Default state
const defaultState = {
    loading: true,
    error: null,
    summary: null,
    dailyStats: null,
    screeningsToday: [],
    isRefreshing: false,
};

export function useDashboard(initialDate = '') {
    const [state, setState] = useState(defaultState);

    useEffect(() => {
        let cancelled = false;
        let refreshId;

        async function fetchData() {
            setState(prev => ({ ...prev, isRefreshing: true, loading: prev.summary === null }));

            try {
                // dateToUse: prioritaskan initialDate (dari date picker user)
                // Jika initialDate kosong, pakai today WIB - bukan stats.tanggal (bisa kemarin)
                const todayStr = new Date(
                    new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })
                ).toLocaleDateString('en-CA'); // format YYYY-MM-DD dalam WIB
                const dateToUse = initialDate || todayStr;

                // 1. Ambil daily_stats untuk tanggal YANG DIPILIH saja
                const { data: statsForDate, error: statsError } = await supabase
                    .from('daily_stats')
                    .select('*')
                    .eq('tanggal', dateToUse)
                    .maybeSingle();

                if (statsError) throw statsError;

                // 2. Ambil cumulative dari row TERBARU (untuk all-time stats)
                const { data: latestStats } = await supabase
                    .from('daily_stats')
                    .select('cum_total_trades, cum_total_wins, cum_profit_sum, win_rate_all_time')
                    .order('tanggal', { ascending: false })
                    .limit(1)
                    .single();

                // 3. Ambil screenings untuk tanggal yang dipilih
                const { data: screenings, error: screeningsError } = await supabase
                    .from('screenings')
                    .select('*')
                    .eq('tanggal', dateToUse)
                    .order('updated_at', { ascending: false });

                if (screeningsError) throw screeningsError;

                // 4. Hitung summary dari screenings tanggal ini
                const totalToday     = screenings?.length || 0;
                const winsToday      = screenings?.filter(s => s.result === 'WIN').length || 0;
                const lossesToday    = screenings?.filter(s => s.result === 'LOSS').length || 0;
                const flatsToday     = screenings?.filter(s => s.result === 'FLAT').length || 0;
                const completedTrades = winsToday + lossesToday + flatsToday;

                // win_rate_harian: dari daily_stats tanggal ini, atau hitung manual, atau NULL jika belum ada
                // PENTING: null jika belum ada data hari ini (bukan pakai data kemarin)
                const winRateToday = statsForDate?.win_rate_harian != null
                    ? parseFloat(statsForDate.win_rate_harian)
                    : (completedTrades > 0 ? (winsToday / completedTrades * 100) : null);

                const avgProfitToday = statsForDate?.avg_profit_harian != null
                    ? parseFloat(statsForDate.avg_profit_harian)
                    : null;

                // 5. Kumulatif dari latest stats (seluruh history, bukan hanya hari ini)
                const cumTrades      = latestStats?.cum_total_trades || 0;
                const cumWins        = latestStats?.cum_total_wins || 0;
                const winRateAllTime = latestStats?.win_rate_all_time != null
                    ? parseFloat(latestStats.win_rate_all_time)
                    : (cumTrades > 0 ? (cumWins / cumTrades * 100) : null);

                const summary = {
                    win_rate_harian:    winRateToday,      // null jika belum ada data hari ini
                    win_rate_all_time:  winRateAllTime,    // null jika belum ada data sama sekali
                    cum_total_trades:   cumTrades,
                    cum_total_wins:     cumWins,
                    avg_profit_harian:  avgProfitToday,    // null jika belum ada data hari ini
                    total_today:        totalToday,
                    total_wins_today:   winsToday,
                };

                // dailyStats: hanya data tanggal yang dipilih (untuk BUY/SKIP/WIN/LOSS count)
                const dailyStats = statsForDate || null;
                const screeningsToday = screenings || [];

                if (!cancelled) {
                    setState({
                        loading: false,
                        error: null,
                        summary,
                        dailyStats,
                        screeningsToday,
                        isRefreshing: false,
                    });
                }
            } catch (err) {
                console.error('Dashboard fetch error:', err);
                if (!cancelled) {
                    setState(prev => ({
                        ...prev,
                        error: err.message || 'Unknown error loading dashboard',
                        loading: false,
                        isRefreshing: false,
                    }));
                }
            }
        }

        // Panggil pertama kalinya
        fetchData();

        // Auto-refresh setiap 60 detik (1 menit)
        refreshId = setInterval(fetchData, 60_000);

        // Cleanup
        return () => {
            cancelled = true;
            if (refreshId) {
                clearInterval(refreshId);
            }
        };
    }, [initialDate]);

    return state;
}