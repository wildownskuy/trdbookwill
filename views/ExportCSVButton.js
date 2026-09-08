// views/ExportCSVButton.js
// Tombol untuk ekspor data screenings ke CSV
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Download } from 'lucide-react';

export function ExportCSVButton({ date = '' }) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    try {
      setExporting(true);
      let query = supabase
        .from('screenings')
        .select('*')
        .order('tanggal', { ascending: false });

      if (date) {
        query = query.eq('tanggal', date);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        alert('Tidak ada data untuk diekspor.');
        return;
      }

      // Convert rows to CSV
      const headers = [
        'tanggal',
        'ticker',
        'hari',
        'is_friday',
        'open_s1',
        'close_s1',
        'high_s1',
        'low_s1',
        'rsi_s1',
        's1_body_pct',
        'vol_spike_ratio',
        'bull_candle_ratio',
        'freq_s1',
        'rule1_match',
        'open_s2',
        'gap_pct',
        'entry_decision',
        'entry_price',
        'close_s2',
        'profit_pct',
        'result',
      ];

      const csvRows = [];
      csvRows.push(headers.join(','));

      for (const row of data) {
        const values = headers.map((header) => {
          const val = row[header];
          if (val === null || val === undefined) return '';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        });
        csvRows.push(values.join(','));
      }

      const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows.join('\n'));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', csvContent);
      downloadAnchor.setAttribute('download', `screenings_${date || 'all'}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error('Export CSV error:', err);
      alert('Gagal mengekspor data: ' + (err.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="inline-flex items-center gap-2 bg-[#121824] hover:bg-[#1A2234] text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-xl border border-[#1E293B] transition disabled:opacity-50 shadow-sm"
    >
      <Download className={`w-3.5 h-3.5 text-emerald-400 ${exporting ? 'animate-bounce' : ''}`} />
      <span>{exporting ? 'Mengekspor...' : 'Export CSV'}</span>
    </button>
  );
}
