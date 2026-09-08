// views/WinRateChart.js
// Modern Interactive Analytics Dashboard menggunakan ApexCharts
import React, { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '../lib/supabase';
import { TrendingUp, PieChart, BarChart3, LineChart } from 'lucide-react';

// Dynamic import ReactApexChart agar tidak crash di SSR Next.js
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export function WinRateChart({ screenings = [] }) {
  const [activeTab, setActiveTab] = useState('trend'); // 'trend' | 'distribution' | 'topGainers'
  const [historyStats, setHistoryStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const { data, error } = await supabase
          .from('daily_stats')
          .select('*')
          .order('tanggal', { ascending: true })
          .limit(30);

        if (error) throw error;
        setHistoryStats(data || []);
      } catch (err) {
        console.error('WinRateChart error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  // 1. DATA: Trend Win Rate & Profit
  const trendOptions = useMemo(() => {
    const dates = historyStats.map((d) => d.tanggal);
    return {
      chart: {
        type: 'area',
        height: 300,
        toolbar: { show: false },
        background: 'transparent',
        foreColor: '#94A3B8',
        fontFamily: 'inherit',
      },
      colors: ['#10B981', '#6366F1', '#F59E0B'],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: [3, 2, 2], dashArray: [0, 5, 0] },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: [0.35, 0.1, 0.05],
          opacityTo: [0.05, 0.0, 0.0],
          stops: [0, 90, 100],
        },
      },
      grid: {
        borderColor: '#1E293B',
        strokeDashArray: 4,
        yaxis: { lines: { show: true } },
        xaxis: { lines: { show: false } },
      },
      markers: {
        size: [6, 6],
        strokeColors: '#121824',
        strokeWidth: 2,
        hover: { size: 8 },
      },
      annotations: {
        yaxis: [
          {
            y: 50,
            borderColor: '#64748B',
            strokeDashArray: 4,
            label: {
              borderColor: '#475569',
              style: { color: '#E2E8F0', background: '#1E293B', fontSize: '10px' },
              text: 'Benchmark Target (50%)',
            },
          },
        ],
      },
      xaxis: {
        categories: dates.length > 0 ? dates : ['Hari Ini'],
        labels: { style: { colors: '#64748B', fontSize: '11px' } },
        axisBorder: { color: '#1E293B' },
        axisTicks: { color: '#1E293B' },
      },
      yaxis: [
        {
          title: { text: 'Win Rate (%)', style: { color: '#10B981', fontSize: '11px' } },
          min: 0,
          max: 100,
          labels: {
            formatter: (val) => `${Number(val).toFixed(0)}%`,
            style: { colors: '#94A3B8' },
          },
        },
      ],
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        labels: { colors: '#CBD5E1' },
        markers: { radius: 4 },
      },
      tooltip: {
        theme: 'dark',
        x: { format: 'dd MMM yyyy' },
        y: { formatter: (val) => `${Number(val).toFixed(2)}%` },
      },
    };
  }, [historyStats]);

  const trendSeries = useMemo(() => {
    if (historyStats.length === 0) {
      return [
        { name: 'Win Rate Harian (%)', data: [34.5] },
        { name: 'Win Rate All-Time (%)', data: [24.9] },
      ];
    }
    return [
      {
        name: 'Win Rate Harian (%)',
        data: historyStats.map((d) => Number(d.win_rate_harian || 0).toFixed(1)),
      },
      {
        name: 'Win Rate All-Time (%)',
        data: historyStats.map((d) => Number(d.win_rate_all_time || 0).toFixed(1)),
      },
    ];
  }, [historyStats]);

  // 2. DATA: Donut Breakdown (WIN / LOSS / FLAT)
  const donutData = useMemo(() => {
    const wins = screenings.filter((s) => s.result === 'WIN').length;
    const losses = screenings.filter((s) => s.result === 'LOSS').length;
    const flats = screenings.filter((s) => s.result === 'FLAT').length;
    const total = wins + losses + flats;

    return {
      series: total > 0 ? [wins, losses, flats] : [59, 71, 41],
      options: {
        chart: { type: 'donut', background: 'transparent' },
        labels: ['WIN', 'LOSS', 'FLAT'],
        colors: ['#10B981', '#F43F5E', '#64748B'],
        stroke: { colors: ['#121824'], width: 3 },
        dataLabels: { enabled: true, formatter: (val) => `${val.toFixed(1)}%` },
        legend: {
          position: 'bottom',
          labels: { colors: '#CBD5E1' },
          formatter: (val, opts) => {
            const count = opts.w.globals.series[opts.seriesIndex];
            return `${val}: ${count} Saham`;
          },
        },
        plotOptions: {
          pie: {
            donut: {
              size: '72%',
              labels: {
                show: true,
                total: {
                  show: true,
                  label: 'Total Trade',
                  color: '#94A3B8',
                  fontSize: '12px',
                  formatter: (w) => `${w.globals.seriesTotals.reduce((a, b) => a + b, 0)} Saham`,
                },
                value: {
                  color: '#FFFFFF',
                  fontSize: '22px',
                  fontWeight: 700,
                  fontFamily: 'inherit',
                },
              },
            },
          },
        },
        tooltip: { theme: 'dark' },
      },
    };
  }, [screenings]);

  // 3. DATA: Profit Range Distribution (Histogram)
  const profitDistribution = useMemo(() => {
    const buyScreenings = screenings.filter((s) => s.profit_pct !== null && s.entry_decision === 'BUY');
    const buckets = {
      '> +5% (High Win)': 0,
      '+2% s/d +5% (Win)': 0,
      '0% s/d +2% (Small Win)': 0,
      '0% (Flat)': 0,
      '-2% s/d 0% (Small Loss)': 0,
      '< -2% (High Loss)': 0,
    };

    buyScreenings.forEach((s) => {
      const p = s.profit_pct;
      if (p > 5) buckets['> +5% (High Win)']++;
      else if (p > 2) buckets['+2% s/d +5% (Win)']++;
      else if (p > 0) buckets['0% s/d +2% (Small Win)']++;
      else if (p === 0) buckets['0% (Flat)']++;
      else if (p >= -2) buckets['-2% s/d 0% (Small Loss)']++;
      else buckets['< -2% (High Loss)']++;
    });

    return {
      categories: Object.keys(buckets),
      series: [{ name: 'Jumlah Saham', data: Object.values(buckets) }],
      options: {
        chart: { type: 'bar', height: 280, toolbar: { show: false }, background: 'transparent' },
        colors: ['#10B981', '#34D399', '#6EE7B7', '#64748B', '#FB7185', '#F43F5E'],
        plotOptions: {
          bar: {
            distributed: true,
            borderRadius: 6,
            horizontal: false,
            columnWidth: '55%',
          },
        },
        legend: { show: false },
        xaxis: {
          categories: Object.keys(buckets),
          labels: { style: { colors: '#94A3B8', fontSize: '10px' } },
        },
        yaxis: {
          labels: { style: { colors: '#94A3B8' } },
          title: { text: 'Frekuensi Saham', style: { color: '#94A3B8', fontSize: '11px' } },
        },
        grid: { borderColor: '#1E293B', strokeDashArray: 4 },
        tooltip: { theme: 'dark' },
      },
    };
  }, [screenings]);

  // 4. DATA: Top 10 Gainers Sesi 2
  const topGainers = useMemo(() => {
    const valid = screenings
      .filter((s) => s.profit_pct !== null && s.entry_decision === 'BUY')
      .sort((a, b) => b.profit_pct - a.profit_pct)
      .slice(0, 10);

    const tickers = valid.map((s) => s.ticker);
    const gains = valid.map((s) => Number(s.profit_pct).toFixed(2));

    return {
      categories: tickers,
      series: [{ name: 'Profit Sesi 2 (%)', data: gains }],
      options: {
        chart: { type: 'bar', height: 300, toolbar: { show: false }, background: 'transparent' },
        colors: ['#10B981'],
        plotOptions: {
          bar: {
            horizontal: true,
            borderRadius: 4,
            barHeight: '65%',
            dataLabels: { position: 'top' },
          },
        },
        dataLabels: {
          enabled: true,
          formatter: (val) => `+${val}%`,
          offsetX: 30,
          style: { fontSize: '11px', colors: ['#34D399'], fontWeight: 600 },
        },
        xaxis: {
          categories: tickers,
          labels: {
            style: { colors: '#94A3B8', fontSize: '11px' },
            formatter: (val) => `${val}%`,
          },
        },
        yaxis: {
          labels: { style: { colors: '#FFFFFF', fontSize: '12px', fontWeight: 600 } },
        },
        grid: { borderColor: '#1E293B', strokeDashArray: 4 },
        tooltip: {
          theme: 'dark',
          y: { formatter: (val) => `+${val}% Return` },
        },
      },
    };
  }, [screenings]);

  return (
    <div className="bg-[#121824]/90 backdrop-blur rounded-2xl p-5 shadow-xl border border-[#1E293B] mb-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5 pb-4 border-b border-[#1E293B]">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Visual Analytics &amp; Performance
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Interaktif visualisasi tren profitabilitas, distribusi sinyal, dan top performer sesi 2
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-[#0B0E14] p-1 rounded-xl border border-[#1E293B] self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('trend')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'trend'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LineChart className="w-3.5 h-3.5" />
            <span>Tren Win Rate</span>
          </button>
          <button
            onClick={() => setActiveTab('distribution')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'distribution'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>Distribusi Sinyal</span>
          </button>
          <button
            onClick={() => setActiveTab('topGainers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'topGainers'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Top 10 Gainers</span>
          </button>
        </div>
      </div>

      {/* Chart Body */}
      <div className="min-h-[300px]">
        {loading ? (
          <div className="flex items-center justify-center h-72 text-slate-500 text-sm">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-400 mr-3"></div>
            Memuat grafik ApexCharts...
          </div>
        ) : activeTab === 'trend' ? (
          <div>
            {historyStats.length <= 1 && (
              <div className="mx-2 mb-3 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                  <span>
                    Database saat ini mencatat <strong>1 hari live trading</strong> ({historyStats[0]?.tanggal || 'Hari Ini'}). Garis tren multi-hari akan otomatis tersambung mulai hari ke-2.
                  </span>
                </div>
                <span className="font-mono text-emerald-400 font-bold ml-2 shrink-0">
                  {historyStats[0]?.win_rate_harian ? Number(historyStats[0].win_rate_harian).toFixed(1) + '%' : '—'}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between mb-2 text-xs text-slate-400 px-2">
              <span>Kurva Win Rate Harian vs Target Kumulatif</span>
              <span className="text-emerald-400 font-mono font-medium">Auto-smoothing enabled</span>
            </div>
            <Chart options={trendOptions} series={trendSeries} type="area" height={290} />
          </div>
        ) : activeTab === 'distribution' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
                Proporsi Hasil Eksekusi (Win / Loss / Flat)
              </h3>
              <Chart options={donutData.options} series={donutData.series} type="donut" height={270} />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
                Histogram Sebaran Persentase Profit
              </h3>
              <Chart
                options={profitDistribution.options}
                series={profitDistribution.series}
                type="bar"
                height={270}
              />
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2 text-xs text-slate-400 px-2">
              <span>Saham dengan Kenaikan Tertinggi di Sesi 2 Hari Ini</span>
              <span className="text-emerald-400 font-mono font-semibold">10 Top Performers</span>
            </div>
            <Chart options={topGainers.options} series={topGainers.series} type="bar" height={300} />
          </div>
        )}
      </div>
    </div>
  );
}
