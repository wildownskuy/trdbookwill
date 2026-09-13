// views/WinRateCard.js
// Modern Trading Terminal KPI Cards
import React from "react";
import { Target, Activity, Zap, BarChart2, ShieldCheck, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

export function WinRateCard({ summary, dailyStats, date }) {
    const winRateHarian  = summary?.win_rate_harian;
    const winRateAllTime = summary?.win_rate_all_time;
    const cumTrades      = summary?.cum_total_trades;
    const avgProfitHarian = summary?.avg_profit_harian;

    const totalBuy   = dailyStats?.total_buy   ?? 0;
    const totalSkip  = dailyStats?.total_skip  ?? 0;
    const totalRule1 = dailyStats?.total_rule1_match ?? (summary?.total_today ?? 0);
    const totalWin   = dailyStats?.total_win   ?? (summary?.total_wins_today ?? 0);
    const totalLoss  = dailyStats?.total_loss  ?? 0;
    const totalFlat  = dailyStats?.total_flat  ?? 0;
    const totalCompleted = totalWin + totalLoss + totalFlat;

    // --- Flag kesesuaian data ---
    const hasScreenings  = totalRule1 > 0;
    const hasTradeData   = totalBuy > 0;
    const hasEvalData    = totalCompleted > 0;
    const hasAllTimeData = (cumTrades ?? 0) > 0;

    const executionRate = hasScreenings ? ((totalBuy / totalRule1) * 100).toFixed(1) : "—";

    // Label tanggal dinamis — pakai WIB agar konsisten dengan backend
    const todayStr  = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })).toLocaleDateString('en-CA');
    const isToday   = !date || date === todayStr;
    const dateLabel = isToday ? "Hari Ini" : date;

    // Status kelengkapan evaluasi
    const completionPct    = hasTradeData ? Math.round((totalCompleted / totalBuy) * 100) : 0;
    const isFullyEvaluated = hasTradeData && totalCompleted >= totalBuy;
    const evalLabel        = !hasTradeData    ? "Belum Ada Trade"
                           : isFullyEvaluated ? "100% Verified"
                           : `${completionPct}% Evaluated`;

    // Win rate: hanya tampil jika sudah ada evaluasi
    const wrHarianDisplay = hasEvalData
        ? Number(winRateHarian ?? (totalWin / totalCompleted * 100)).toFixed(1) + "%"
        : "—";

    // Avg profit: hanya tampil jika sudah ada evaluasi
    const avgProfitDisplay = hasEvalData && avgProfitHarian != null
        ? `${avgProfitHarian > 0 ? "+" : ""}${Number(avgProfitHarian).toFixed(2)}%`
        : "—";
    const avgProfitColor = !hasEvalData       ? "text-slate-500"
                         : avgProfitHarian > 0 ? "text-emerald-400"
                         : avgProfitHarian < 0 ? "text-rose-400"
                         : "text-slate-200";

    // Pesan kontekstual saat menunggu
    const waitingMsg = hasTradeData   ? "Menunggu evaluasi (15:50)"
                     : hasScreenings  ? "Menunggu check-gap (13:35)"
                     : "Belum ada sinyal lolos hari ini";

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6">

            {/* 1. Win Rate Harian */}
            <div className="bg-[#121824]/90 backdrop-blur border border-[#1E293B] hover:border-emerald-500/40 transition-all duration-300 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all"></div>
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-emerald-400" />
                        Win Rate Sesi 2
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {dateLabel}
                    </span>
                </div>

                <div className="flex items-baseline gap-2 mb-3">
                    <span className={`text-3xl font-extrabold font-mono tracking-tight ${hasEvalData ? "text-white" : "text-slate-600"}`}>
                        {wrHarianDisplay}
                    </span>
                    {hasEvalData && (
                        <span className="text-xs text-slate-500 font-medium">({totalWin}/{totalCompleted})</span>
                    )}
                </div>

                <div className="w-full bg-[#0B0E14] h-1.5 rounded-full overflow-hidden mb-3 border border-slate-800">
                    {hasEvalData ? (
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${
                                (winRateHarian ?? 0) >= 50
                                    ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                                    : "bg-gradient-to-r from-amber-500 to-emerald-400"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, winRateHarian ?? 0))}%` }}
                        />
                    ) : (
                        <div className="h-full bg-slate-700 rounded-full opacity-30 w-full" />
                    )}
                </div>

                <div className="pt-2 border-t border-[#1E293B]/60 text-[11px] font-mono flex items-center justify-between">
                    {hasEvalData ? (
                        <>
                            <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">{totalWin} WIN</span>
                            <span className="text-rose-400 font-semibold bg-rose-500/10 px-1.5 py-0.5 rounded">{totalLoss} LOSS</span>
                            <span className="text-slate-400 font-semibold bg-slate-800 px-1.5 py-0.5 rounded">{totalFlat} FLAT</span>
                        </>
                    ) : (
                        <span className="text-slate-500 flex items-center gap-1.5 text-[10px]">
                            <AlertCircle className="w-3 h-3" />
                            {waitingMsg}
                        </span>
                    )}
                </div>
            </div>

            {/* 2. Rata-rata Profit Harian */}
            <div className="bg-[#121824]/90 backdrop-blur border border-[#1E293B] hover:border-blue-500/40 transition-all duration-300 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all"></div>
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-blue-400" />
                        Avg Profit S2
                    </span>
                    {hasEvalData ? (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            (avgProfitHarian ?? 0) >= 0
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}>
                            {(avgProfitHarian ?? 0) >= 0 ? "Surplus" : "Defisit"}
                        </span>
                    ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-slate-700">
                            Belum Ada
                        </span>
                    )}
                </div>

                <div className="flex items-baseline gap-2 mb-3">
                    <span className={`text-3xl font-extrabold font-mono tracking-tight ${avgProfitColor}`}>
                        {avgProfitDisplay}
                    </span>
                    {hasEvalData && avgProfitHarian > 0 && <TrendingUp className="w-4 h-4 text-emerald-400 self-center" />}
                    {hasEvalData && avgProfitHarian < 0 && <TrendingDown className="w-4 h-4 text-rose-400 self-center" />}
                </div>

                <div className="w-full bg-[#0B0E14] h-1.5 rounded-full overflow-hidden mb-3 border border-slate-800">
                    {hasEvalData ? (
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${(avgProfitHarian ?? 0) >= 0 ? "bg-emerald-400" : "bg-rose-500"}`}
                            style={{ width: `${Math.min(100, Math.max(5, Math.abs(avgProfitHarian || 0) * 15))}%` }}
                        />
                    ) : (
                        <div className="h-full bg-slate-700 rounded-full opacity-30 w-full" />
                    )}
                </div>

                <div className="pt-2 border-t border-[#1E293B]/60 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Return per posisi BUY</span>
                    <span className="text-slate-300 font-mono">Net EOD</span>
                </div>
            </div>

            {/* 3. Eksekusi Sesi 2 (BUY vs SKIP) */}
            <div className="bg-[#121824]/90 backdrop-blur border border-[#1E293B] hover:border-amber-500/40 transition-all duration-300 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all"></div>
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        Eksekusi vs Gap
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        hasScreenings
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-slate-800 text-slate-500 border-slate-700"
                    }`}>
                        {hasScreenings ? `${executionRate}% BUY` : "Belum Ada Sinyal"}
                    </span>
                </div>

                <div className="flex items-baseline gap-2 mb-3">
                    <span className={`text-3xl font-extrabold font-mono tracking-tight ${hasTradeData ? "text-emerald-400" : "text-slate-600"}`}>
                        {totalBuy}
                    </span>
                    <span className="text-sm font-bold text-slate-400 uppercase">BUY</span>
                    <span className="text-xs text-slate-500 ml-auto font-mono">{totalSkip} SKIP</span>
                </div>

                <div className="w-full bg-[#0B0E14] h-1.5 rounded-full overflow-hidden mb-3 border border-slate-800 flex">
                    {hasScreenings ? (
                        <>
                            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(totalBuy / totalRule1) * 100}%` }} />
                            <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${(totalSkip / totalRule1) * 100}%` }} />
                        </>
                    ) : (
                        <div className="h-full bg-slate-700 rounded-full opacity-30 w-full" />
                    )}
                </div>

                <div className="pt-2 border-t border-[#1E293B]/60 text-[11px] text-slate-400 flex items-center justify-between">
                    <span className="text-amber-300 font-mono">{totalSkip} Di-skip</span>
                    <span className="font-mono">
                        {hasScreenings ? `Total ${totalRule1} Sinyal S1` : "Menunggu Screening 12:00"}
                    </span>
                </div>
            </div>

            {/* 4. Win Rate All-Time */}
            <div className="bg-[#121824]/90 backdrop-blur border border-[#1E293B] hover:border-indigo-500/40 transition-all duration-300 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all"></div>
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
                        <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
                        Win Rate All-Time
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        Kumulatif
                    </span>
                </div>

                <div className="flex items-baseline gap-2 mb-3">
                    <span className={`text-3xl font-extrabold font-mono tracking-tight ${hasAllTimeData ? "text-white" : "text-slate-600"}`}>
                        {hasAllTimeData ? Number(winRateAllTime ?? 0).toFixed(1) + "%" : "—"}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">Target &gt;50%</span>
                </div>

                <div className="w-full bg-[#0B0E14] h-1.5 rounded-full overflow-hidden mb-3 border border-slate-800">
                    {hasAllTimeData ? (
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-400 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, winRateAllTime ?? 0))}%` }}
                        />
                    ) : (
                        <div className="h-full bg-slate-700 rounded-full opacity-30 w-full" />
                    )}
                </div>

                <div className="pt-2 border-t border-[#1E293B]/60 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Semua Hari Live Test</span>
                    <span className="text-indigo-300 font-mono font-semibold">
                        {hasAllTimeData ? `${summary?.cum_total_wins ?? 0} Total WIN` : "Belum Ada Data"}
                    </span>
                </div>
            </div>

            {/* 5. Total Evaluasi Saham */}
            <div className="bg-[#121824]/90 backdrop-blur border border-[#1E293B] hover:border-slate-600/60 transition-all duration-300 rounded-2xl p-5 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/5 rounded-full blur-2xl group-hover:bg-slate-500/10 transition-all"></div>
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                        Total Evaluasi
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        Validated
                    </span>
                </div>

                <div className="flex items-baseline gap-2 mb-3">
                    <span className={`text-3xl font-extrabold font-mono tracking-tight ${hasAllTimeData ? "text-white" : "text-slate-600"}`}>
                        {hasAllTimeData ? Number(cumTrades).toLocaleString("id-ID") : "—"}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">Trades</span>
                </div>

                <div className="w-full bg-[#0B0E14] h-1.5 rounded-full overflow-hidden mb-3 border border-slate-800">
                    <div className={`h-full rounded-full w-full ${hasAllTimeData ? "bg-slate-600" : "bg-slate-700 opacity-30"}`} />
                </div>

                <div className="pt-2 border-t border-[#1E293B]/60 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Database Record</span>
                    <span className={`font-mono ${isFullyEvaluated ? "text-emerald-400" : !hasTradeData ? "text-slate-500" : "text-amber-400"}`}>
                        {evalLabel}
                    </span>
                </div>
            </div>

        </div>
    );
}
