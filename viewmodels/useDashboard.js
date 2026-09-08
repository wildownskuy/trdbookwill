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
                // 1. Ambil statistik harian dari daily_stats (terbaru)
                const { data: stats, error: statsError } = await supabase
                    .from('daily_stats')
                    .select('*')
                    .order('tanggal', { ascending: false })
                    .limit(1)
                    .single();

                if (statsError && statsError.code !== 'PGRST116') { // PGRST116 = not found, itu OK
                    throw statsError;
                }

                // 2. Ambil screenings untuk hari ini
                const dateToUse = initialDate || stats?.tanggal || new Date().toISOString().split('T')[0];

                const { data: screenings, error: screeningsError } = await supabase
                    .from('screenings')
                    .select('*')
                    .eq('tanggal', dateToUse)
                    .order('updated_at', { ascending: false });

                if (screeningsError) {
                    throw screeningsError;
                }

                // 3. Hitung summary manual dari screenings yang sudah ada
                const totalToday = screenings?.length || 0;
                const winsToday = screenings?.filter(s => s.result === 'WIN').length || 0;
                const lossesToday = screenings?.filter(s => s.result === 'LOSS').length || 0;
                const flatsToday = screenings?.filter(s => s.result === 'FLAT').length || 0;
                const completedTrades = winsToday + lossesToday + flatsToday;
                const winRateToday = stats?.win_rate_harian !== undefined && stats?.win_rate_harian !== null
                    ? parseFloat(stats.win_rate_harian)
                    : (completedTrades > 0 ? (winsToday / completedTrades * 100) : 0);

                // 4. Ambil kumulatif dari stat terbaru
                const cumTrades = stats?.cum_total_trades || 0;
                const cumWins = stats?.cum_total_wins || 0;
                const winRateAllTime = stats?.win_rate_all_time !== undefined && stats?.win_rate_all_time !== null
                    ? parseFloat(stats.win_rate_all_time)
                    : (cumTrades > 0 ? (cumWins / cumTrades * 100) : 0);
                const avgProfitAllTime = cumTrades > 0 ? (stats?.cum_profit_sum || 0) / cumTrades : 0;

                const summary = {
                    win_rate_harian: winRateToday,
                    win_rate_all_time: winRateAllTime,
                    cum_total_trades: cumTrades,
                    cum_total_wins: cumWins,
                    avg_profit_harian: parseFloat(stats?.avg_profit_harian || 0),
                    avg_profit_all_time: parseFloat(avgProfitAllTime),
                    total_today: totalToday,
                    total_wins_today: winsToday,
                };

                const dailyStats = stats || null;
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