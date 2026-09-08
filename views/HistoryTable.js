// views/HistoryTable.js
// Modern Financial History Table
import React, { useState } from 'react';
import { useHistory } from '../viewmodels/useHistory';
import { DataTable } from '../components/DataTable';
import { CheckCircle, AlertTriangle, Trophy, TrendingDown, Minus, History, Clock } from 'lucide-react';

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

export function HistoryTable({ date } = {}) {
  const [viewAll, setViewAll] = useState(false);
  const queryDate = viewAll ? 'ALL' : date;
  const { state, loading, error } = useHistory(queryDate);

  const columns = [
    {
      key: 'tanggal',
      label: 'Tanggal',
      sortable: true,
      render: (row) => <span className="text-slate-300 font-mono text-xs font-semibold">{row.tanggal}</span>,
    },
    {
      key: 'ticker',
      label: 'Saham',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-100 font-mono tracking-wider">{row.ticker}</span>
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
        <span className="text-slate-300 font-mono text-xs font-medium">
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
        <span className="text-purple-300 font-mono text-xs font-semibold">
          {row.freq_s1 !== null && row.freq_s1 !== undefined ? Number(row.freq_s1).toLocaleString('id-ID') : '—'}
        </span>
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
        return <span className={`font-mono text-xs font-bold ${color}`}>{val.toFixed(1)}</span>;
      },
    },
    {
      key: 'vol_spike_ratio',
      label: 'Vol Spike',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded text-xs font-mono font-medium">
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
            className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded ${
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
        <span className="text-slate-300 font-mono text-xs font-medium">
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
    {
      key: 'updated_at',
      label: 'Waktu Sync',
      sortable: true,
      align: 'center',
      render: (row) => {
        const ts = row.updated_at || row.created_at;
        return (
          <span className="text-slate-400 font-mono text-[11px] flex items-center justify-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            {ts ? new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}
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
        <span>Memuat riwayat evaluasi...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#121824]/90 backdrop-blur rounded-2xl p-6 shadow-xl border border-rose-500/30 text-rose-400">
        Gagal memuat riwayat: {error}
      </div>
    );
  }

  const items = state || [];

  return (
    <div className="bg-[#121824]/90 backdrop-blur rounded-2xl p-5 shadow-xl border border-[#1E293B]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-[#1E293B]">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" />
            Riwayat Screening &amp; Evaluasi ({items.length} Record)
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {viewAll ? 'Menampilkan seluruh riwayat dari database' : `Menampilkan data tanggal: ${date || 'Hari Ini'}`}
          </p>
        </div>

        {/* Toggle Mode */}
        <div className="flex items-center gap-1 bg-[#0B0E14] p-1 rounded-xl border border-[#1E293B] self-start sm:self-auto">
          <button
            onClick={() => setViewAll(false)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              !viewAll
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tanggal Terpilih
          </button>
          <button
            onClick={() => setViewAll(true)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
              viewAll
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Semua Tanggal
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={items}
        statusFilters={STATUS_FILTERS}
        defaultSort={{ key: 'tanggal', direction: 'desc' }}
        defaultPageSize={25}
        searchPlaceholder="Cari riwayat (kode saham atau tanggal)..."
      />
    </div>
  );
}