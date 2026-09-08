// views/WatchlistToday.js
// Modern Financial Watchlist dengan Visual Meters, Ticker Badges, dan Detail Modal
import React, { useState } from 'react';
import { useHistory } from '../viewmodels/useHistory';
import { DataTable } from '../components/DataTable';
import { 
  CheckCircle, AlertTriangle, Trophy, TrendingDown, 
  Minus, X, BarChart3, ExternalLink, Zap, ShieldAlert
} from 'lucide-react';

const DECISION_BADGE = {
  BUY: {
    bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    icon: <CheckCircle className="w-3 h-3 text-emerald-400" />,
  },
  SKIP: {
    bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    icon: <AlertTriangle className="w-3 h-3 text-amber-400" />,
  },
  PENDING: {
    bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    icon: <Minus className="w-3 h-3 text-blue-400" />,
  },
};

const RESULT_BADGE = {
  WIN: {
    bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    icon: <Trophy className="w-3 h-3 text-emerald-400" />,
  },
  LOSS: {
    bg: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
    icon: <TrendingDown className="w-3 h-3 text-rose-400" />,
  },
  FLAT: {
    bg: 'bg-slate-800 text-slate-400 border-slate-700',
    icon: <Minus className="w-3 h-3 text-slate-400" />,
  },
  PENDING: {
    bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    icon: <Minus className="w-3 h-3 text-blue-400" />,
  },
};

export function WatchlistToday({ date } = {}) {
  const { state, loading, error } = useHistory(date);
  const [selectedStock, setSelectedStock] = useState(null);

  const columns = [
    {
      key: 'ticker',
      label: 'Saham',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#1A2234] border border-[#2D3748] flex items-center justify-center font-mono font-bold text-xs text-slate-200 shadow-sm group-hover:border-emerald-500/50">
            {row.ticker ? row.ticker.substring(0, 2) : '—'}
          </div>
          <div>
            <div className="font-bold text-slate-100 font-mono tracking-wider flex items-center gap-1.5">
              <span>{row.ticker}</span>
              {row.profit_pct && row.profit_pct > 5 ? (
                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  TOP
                </span>
              ) : null}
            </div>
            <span className="text-[10px] text-slate-500 font-mono">BEI Reguler</span>
          </div>
        </div>
      ),
    },
    {
      key: 'entry_decision',
      label: 'Keputusan',
      sortable: true,
      render: (row) => {
        const item = DECISION_BADGE[row.entry_decision] || DECISION_BADGE.PENDING;
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${item.bg}`}>
            {item.icon}
            <span>{row.entry_decision || 'PENDING'}</span>
          </span>
        );
      },
    },
    {
      key: 'close_s1',
      label: 'Close S1',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="text-slate-200 font-mono text-xs font-medium">
          {row.close_s1 !== null && row.close_s1 !== undefined ? `Rp ${Number(row.close_s1).toLocaleString('id-ID')}` : '—'}
        </span>
      ),
    },
    {
      key: 'freq_s1',
      label: 'Freq S1',
      sortable: true,
      align: 'right',
      render: (row) => (
        <div className="flex flex-col items-end">
          <span className="text-purple-300 font-mono text-xs font-semibold">
            {row.freq_s1 !== null && row.freq_s1 !== undefined ? Number(row.freq_s1).toLocaleString('id-ID') : '—'}
          </span>
          <span className="text-[9px] text-slate-500 font-mono">transaksi</span>
        </div>
      ),
    },
    {
      key: 'rsi_s1',
      label: 'RSI S1',
      sortable: true,
      align: 'right',
      render: (row) => {
        if (row.rsi_s1 === null || row.rsi_s1 === undefined) return <span className="text-slate-600">—</span>;
        const val = Number(row.rsi_s1);
        const color = val >= 70 ? 'text-rose-400' : val <= 35 ? 'text-emerald-400' : 'text-amber-300';
        return (
          <div className="flex flex-col items-end">
            <span className={`font-mono text-xs font-bold ${color}`}>{val.toFixed(1)}</span>
            <div className="w-12 bg-[#0B0E14] h-1 rounded-full mt-1 overflow-hidden border border-slate-800">
              <div
                className={`h-full rounded-full ${val >= 70 ? 'bg-rose-500' : val <= 35 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                style={{ width: `${Math.min(100, Math.max(5, val))}%` }}
              ></div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'vol_spike_ratio',
      label: 'Vol Spike',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="inline-block bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded text-xs font-mono font-medium">
          {row.vol_spike_ratio !== null && row.vol_spike_ratio !== undefined ? `${Number(row.vol_spike_ratio).toFixed(2)}x` : '—'}
        </span>
      ),
    },
    {
      key: 'entry_price',
      label: 'Entry (S2)',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="text-slate-100 font-mono text-xs font-semibold">
          {row.entry_price !== null && row.entry_price !== undefined ? `Rp ${Number(row.entry_price).toLocaleString('id-ID')}` : '—'}
        </span>
      ),
    },
    {
      key: 'gap_pct',
      label: 'Gap %',
      sortable: true,
      align: 'right',
      render: (row) => {
        if (row.gap_pct === null || row.gap_pct === undefined) return <span className="text-slate-600">—</span>;
        const val = Number(row.gap_pct);
        const isPos = val > 0;
        const isNeg = val < 0;
        return (
          <span
            className={`inline-block font-mono text-[11px] font-semibold px-2 py-0.5 rounded ${
              isPos ? 'bg-emerald-500/10 text-emerald-400' : isNeg ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {isPos ? '▲ +' : isNeg ? '▼ ' : ''}{val.toFixed(2)}%
          </span>
        );
      },
    },
    {
      key: 'close_s2',
      label: 'Exit (S2)',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="text-slate-200 font-mono text-xs font-medium">
          {row.close_s2 !== null && row.close_s2 !== undefined ? `Rp ${Number(row.close_s2).toLocaleString('id-ID')}` : '—'}
        </span>
      ),
    },
    {
      key: 'profit_pct',
      label: 'Profit / Return',
      sortable: true,
      align: 'right',
      render: (row) => {
        if (row.profit_pct === null || row.profit_pct === undefined) {
          return <span className="text-slate-600 font-mono text-xs">—</span>;
        }
        const val = Number(row.profit_pct);
        const isPos = val > 0;
        const isNeg = val < 0;
        const magnitude = Math.min(100, Math.max(10, Math.abs(val) * 10));

        return (
          <div className="flex flex-col items-end">
            <span
              className={`font-mono text-xs font-bold ${
                isPos ? 'text-emerald-400' : isNeg ? 'text-rose-400' : 'text-slate-300'
              }`}
            >
              {isPos ? '+' : ''}{val.toFixed(2)}%
            </span>
            <div className="w-16 bg-[#0B0E14] h-1.5 rounded-full mt-1 overflow-hidden border border-slate-800 flex justify-end">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isPos ? 'bg-emerald-400' : isNeg ? 'bg-rose-500' : 'bg-slate-600'
                }`}
                style={{ width: `${magnitude}%` }}
              ></div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'result',
      label: 'Hasil',
      sortable: true,
      align: 'center',
      render: (row) => {
        const item = RESULT_BADGE[row.result] || RESULT_BADGE.PENDING;
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${item.bg}`}>
            {item.icon}
            <span>{row.result || 'PENDING'}</span>
          </span>
        );
      },
    },
  ];

  const STATUS_FILTERS = ['ALL', 'BUY', 'SKIP', 'WIN', 'LOSS', 'FLAT'];

  if (loading) {
    return (
      <div className="bg-[#121824]/90 backdrop-blur rounded-2xl p-8 shadow-xl border border-[#1E293B] flex items-center justify-center text-slate-400 py-16">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-emerald-400 mr-3"></div>
        <span>Memuat data watchlist hari ini...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#121824]/90 backdrop-blur rounded-2xl p-6 shadow-xl border border-rose-500/30 text-rose-400">
        Gagal memuat watchlist: {error}
      </div>
    );
  }

  const items = state || [];

  return (
    <div className="bg-[#121824]/90 backdrop-blur rounded-2xl p-5 shadow-xl border border-[#1E293B]">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-[#1E293B]">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            Watchlist Hari Ini ({items.length} Saham Lolos Screening)
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Klik pada baris saham mana saja untuk membuka popup detail teknikal dan parameter Rule 1
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={items}
        statusFilters={STATUS_FILTERS}
        defaultSort={{ key: 'profit_pct', direction: 'desc' }}
        defaultPageSize={25}
        searchPlaceholder="Cari kode saham (cth: JAWA, BBCA, AMMN)..."
        onRowClick={(row) => setSelectedStock(row)}
      />

      {/* Detail Modal */}
      {selectedStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121824] border border-[#1E293B] rounded-2xl max-w-xl w-full p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#1E293B]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-mono font-bold text-lg text-emerald-400">
                  {selectedStock.ticker}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {selectedStock.ticker}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        selectedStock.result === 'WIN'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : selectedStock.result === 'LOSS'
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {selectedStock.result || 'PENDING'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Tanggal: {selectedStock.tanggal} · Keputusan: <span className="text-emerald-400 font-bold">{selectedStock.entry_decision}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStock(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5 text-xs">
              <div className="bg-[#0B0E14] p-3 rounded-xl border border-[#1E293B]">
                <span className="text-slate-500 block">Close Sesi 1</span>
                <span className="text-sm font-bold font-mono text-white">
                  Rp {Number(selectedStock.close_s1 || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="bg-[#0B0E14] p-3 rounded-xl border border-[#1E293B]">
                <span className="text-slate-500 block">Entry Sesi 2</span>
                <span className="text-sm font-bold font-mono text-white">
                  Rp {Number(selectedStock.entry_price || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="bg-[#0B0E14] p-3 rounded-xl border border-[#1E293B]">
                <span className="text-slate-500 block">Exit Sesi 2</span>
                <span className="text-sm font-bold font-mono text-white">
                  Rp {Number(selectedStock.close_s2 || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="bg-[#0B0E14] p-3 rounded-xl border border-[#1E293B]">
                <span className="text-slate-500 block">Gap S2 vs S1</span>
                <span
                  className={`text-sm font-bold font-mono ${
                    (selectedStock.gap_pct || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {Number(selectedStock.gap_pct || 0).toFixed(2)}%
                </span>
              </div>
              <div className="bg-[#0B0E14] p-3 rounded-xl border border-[#1E293B]">
                <span className="text-slate-500 block">Net Profit S2</span>
                <span
                  className={`text-sm font-bold font-mono ${
                    (selectedStock.profit_pct || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {(selectedStock.profit_pct || 0) >= 0 ? '+' : ''}
                  {Number(selectedStock.profit_pct || 0).toFixed(2)}%
                </span>
              </div>
              <div className="bg-[#0B0E14] p-3 rounded-xl border border-[#1E293B]">
                <span className="text-slate-500 block">Frekuensi S1</span>
                <span className="text-sm font-bold font-mono text-purple-300">
                  {Number(selectedStock.freq_s1 || 0).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Rule 1 Checklist */}
            <div className="bg-[#0B0E14] p-4 rounded-xl border border-[#1E293B] mb-5">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                Validasi Rule 1 (Genetic Algorithm)
              </h4>
              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex items-center justify-between">
                  <span>RSI Sesi 1 &le; 71.43:</span>
                  <span className={`font-mono font-semibold ${Number(selectedStock.rsi_s1 || 0) <= 71.43 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {Number(selectedStock.rsi_s1 || 0).toFixed(1)} {Number(selectedStock.rsi_s1 || 0) <= 71.43 ? '✓ Lolos' : '✗ Gagal'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Volume Spike &gt; 1.50x:</span>
                  <span className={`font-mono font-semibold ${Number(selectedStock.vol_spike_ratio || 0) > 1.50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {Number(selectedStock.vol_spike_ratio || 0).toFixed(2)}x {Number(selectedStock.vol_spike_ratio || 0) > 1.50 ? '✓ Lolos' : '✗ Gagal'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Body S1 &le; 6.48%:</span>
                  <span className={`font-mono font-semibold ${Number(selectedStock.s1_body_pct || 0) <= 6.48 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {Number(selectedStock.s1_body_pct || 0).toFixed(2)}% {Number(selectedStock.s1_body_pct || 0) <= 6.48 ? '✓ Lolos' : '✗ Gagal'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-[#1E293B] pt-1.5 mt-1">
                  <span>Gap Filter Open S2 &le; 1.5%:</span>
                  <span className={`font-mono font-semibold ${selectedStock.gap_pct === null ? 'text-blue-400' : Math.abs(Number(selectedStock.gap_pct || 0)) <= 1.5 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {selectedStock.gap_pct !== null ? `${Number(selectedStock.gap_pct || 0).toFixed(2)}% ${Math.abs(Number(selectedStock.gap_pct || 0)) <= 1.5 ? '✓ Lolos' : '✗ Gagal'}` : 'Belum Dicek'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedStock(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
            >
              Tutup Rincian
            </button>
          </div>
        </div>
      )}
    </div>
  );
}