// pages/index.js
// Modern Financial Terminal - BEI Sesi 2 Live Testing Dashboard
import React, { useState, useEffect } from 'react';
import { useDashboard } from '../viewmodels';
import { WinRateCard } from '../views/WinRateCard';
import { WinRateChart } from '../views/WinRateChart';
import { WatchlistToday } from '../views/WatchlistToday';
import { HistoryTable } from '../views/HistoryTable';
import { ExportCSVButton } from '../views/ExportCSVButton';
import { 
  Activity, Clock, RefreshCw, Calendar, 
  Layers, CheckCircle2, ChevronRight, ShieldCheck, Zap
} from 'lucide-react';

export default function HomePage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [currentTime, setCurrentTime] = useState('');
  const [activeViewTab, setActiveViewTab] = useState('today'); // 'today' | 'history'
  const [marketStatus, setMarketStatus] = useState({ isOpen: false, label: 'PASAR TUTUP', phase: '' });

  // Hitung status pasar BEI berdasarkan jam WIB
  function computeMarketStatus() {
    const now = new Date();
    const wib = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const day = wib.getDay(); // 0=Sun, 6=Sat
    const h = wib.getHours();
    const m = wib.getMinutes();
    const hm = h * 60 + m;
    const isFriday = day === 5;
    const isWeekend = day === 0 || day === 6;

    if (isWeekend) return { isOpen: false, label: 'PASAR TUTUP', phase: 'Libur Akhir Pekan' };
    if (hm < 9 * 60) return { isOpen: false, label: 'PRA-PASAR', phase: 'Belum Buka' };
    if (hm < (isFriday ? 11 * 60 + 30 : 12 * 60)) return { isOpen: true, label: 'SESI 1 BUKA', phase: isFriday ? 'Screening 11:30' : 'Screening 12:00' };
    if (hm < 13 * 60) return { isOpen: false, label: 'JEDA SIANG', phase: isFriday ? 'Check Gap 14:05' : 'Check Gap 13:35' };
    if (hm < 15 * 60 + 50) return { isOpen: true, label: 'SESI 2 BUKA', phase: 'Evaluasi 15:50' };
    return { isOpen: false, label: 'PASAR TUTUP', phase: 'Evaluasi Selesai' };
  }

  // Hook untuk data dashboard utama
  const dashboardState = useDashboard(selectedDate);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'Asia/Jakarta',
        }) + ' WIB'
      );
      setMarketStatus(computeMarketStatus());
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100 font-sans pb-20 selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Top Navbar */}
      <nav className="border-b border-[#1E293B] bg-[#0E131F]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-wider uppercase text-white font-mono">
                  TRADEBOOK ENGINE
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  SESI 2 PREDICTOR
                </span>
              </div>
              <span className="text-[11px] text-slate-500 hidden sm:block">
                Sistem Live Testing Otomatis BEI Terintegrasi Supabase
              </span>
            </div>
          </div>

          {/* Market Status & Clock */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-[#121824] px-3 py-1.5 rounded-xl border border-[#1E293B] text-xs font-mono">
              <span className={`w-2 h-2 rounded-full ${marketStatus.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></span>
              <span className={`font-semibold ${marketStatus.isOpen ? 'text-emerald-300' : 'text-slate-400'}`}>{marketStatus.label}</span>
              {marketStatus.phase && <span className="text-slate-600 text-[10px]">{marketStatus.phase}</span>}
              <span className="text-slate-600">|</span>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-emerald-400 font-bold">{currentTime || '00:00:00 WIB'}</span>
            </div>

            {/* Quick Date Selector */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-[#121824] border border-[#1E293B] text-slate-200 text-xs rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono cursor-pointer hover:border-slate-700 transition"
                />
              </div>

              {selectedDate !== todayStr && (
                <button
                  onClick={() => setSelectedDate(todayStr)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                  title="Kembali ke Hari Ini"
                >
                  Hari Ini
                </button>
              )}

              <ExportCSVButton date={selectedDate} />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Pipeline Execution Banner */}
        <div className="bg-[#121824]/90 backdrop-blur rounded-2xl p-4 border border-[#1E293B] mb-6 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Alur Strategi: LightGBM ML Model (Top 30 SHAP) + Gap Filter
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Top 300 Freq <span className="text-slate-600">&rarr;</span> 30 Fitur SHAP <span className="text-slate-600">&rarr;</span> LightGBM predict_proba <span className="text-slate-600">&rarr;</span> proba &ge; 0.85 <span className="text-slate-600">&rarr;</span> Gap &le; 1.5%
                </p>
              </div>
            </div>

            {/* Stages Badges — jam sesuai jadwal BEI (Jum berbeda) */}
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>1. Screening S1 (Sen–Kam 12:00 / Jum 11:30)</span>
              </div>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>2. Check Gap S2 (Sen–Kam 13:35 / Jum 14:05)</span>
              </div>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>3. Evaluasi EOD (15:50)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: KPI Summary Cards */}
        <section>
          <WinRateCard
            summary={dashboardState.summary}
            dailyStats={dashboardState.dailyStats}
            date={selectedDate}
          />
        </section>

        {/* Section 2: ApexCharts Analytics Suite */}
        <section>
          <WinRateChart screenings={dashboardState.screeningsToday} />
        </section>

        {/* Section 3: Screener & Tradebook Data Table */}
        <section className="mb-8">
          {/* Main View Switcher Tabs */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setActiveViewTab('today')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeViewTab === 'today'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'bg-[#121824] text-slate-400 hover:text-white border border-[#1E293B]'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Watchlist Hari Ini ({dashboardState.screeningsToday?.length || 0})</span>
            </button>
            <button
              onClick={() => setActiveViewTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeViewTab === 'history'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'bg-[#121824] text-slate-400 hover:text-white border border-[#1E293B]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Riwayat Evaluasi Lengkap</span>
            </button>
          </div>

          {activeViewTab === 'today' ? (
            <WatchlistToday date={selectedDate} />
          ) : (
            <HistoryTable date={selectedDate} />
          )}
        </section>
      </div>
    </div>
  );
}