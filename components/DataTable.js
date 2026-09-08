// components/DataTable.js
// Modern Financial Terminal DataTable
// Fitur: Instant search, multi-column sort, quick status filter chips, density toggle, pagination, row click
import React, { useState, useMemo } from 'react';
import { 
  Search, X, ArrowUpDown, ArrowUp, ArrowDown, 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  SlidersHorizontal
} from 'lucide-react';

export function DataTable({
  columns = [],
  data = [],
  searchPlaceholder = 'Cari kode saham (cth: BBCA)...',
  statusFilters = [],
  defaultSort = { key: '', direction: 'desc' },
  defaultPageSize = 25,
  pageSizeOptions = [10, 25, 50, 100],
  onRowClick = null,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [sortConfig, setSortConfig] = useState(defaultSort);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [isCompact, setIsCompact] = useState(false);

  // 1. Filtering (Search + Status Filter)
  const filteredData = useMemo(() => {
    let result = [...data];

    // Status Filter
    if (activeFilter !== 'ALL') {
      result = result.filter((row) => {
        return row.entry_decision === activeFilter || row.result === activeFilter;
      });
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((row) => {
        const ticker = (row.ticker || '').toLowerCase();
        const tanggal = (row.tanggal || '').toLowerCase();
        const decision = (row.entry_decision || '').toLowerCase();
        const res = (row.result || '').toLowerCase();
        return ticker.includes(q) || tanggal.includes(q) || decision.includes(q) || res.includes(q);
      });
    }

    return result;
  }, [data, activeFilter, searchQuery]);

  // 2. Sorting
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    const sorted = [...filteredData].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (aVal === null || aVal === undefined) aVal = -Infinity;
      if (bVal === null || bVal === undefined) bVal = -Infinity;

      if (typeof aVal === 'string') {
        const cmp = aVal.localeCompare(bVal);
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    return sorted;
  }, [filteredData, sortConfig]);

  // 3. Pagination
  const totalItems = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedData = useMemo(() => {
    const startIdx = (safePage - 1) * pageSize;
    return sortedData.slice(startIdx, startIdx + pageSize);
  }, [sortedData, safePage, pageSize]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'desc' };
    });
    setCurrentPage(1);
  };

  // Hitung jumlah untuk status filter chips
  const counts = useMemo(() => {
    const c = { ALL: data.length };
    statusFilters.forEach((f) => {
      if (f === 'ALL') return;
      c[f] = data.filter((r) => r.entry_decision === f || r.result === f).length;
    });
    return c;
  }, [data, statusFilters]);

  // Filter color scheme
  const getFilterStyle = (f, isActive) => {
    if (isActive) {
      if (f === 'BUY' || f === 'WIN') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-sm';
      if (f === 'LOSS') return 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-sm';
      if (f === 'SKIP') return 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-sm';
      return 'bg-blue-500/20 text-blue-400 border-blue-500/50 shadow-sm';
    }
    return 'bg-[#0B0E14] text-slate-400 border-[#1E293B] hover:bg-[#1A2234] hover:text-slate-200';
  };

  return (
    <div className="w-full">
      {/* Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
        {/* Search Bar & Density */}
        <div className="flex items-center gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute inset-y-0 left-0 my-auto ml-3 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full bg-[#0B0E14] border border-[#1E293B] text-slate-100 text-xs rounded-xl pl-9 pr-8 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 my-auto mr-2.5 w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white transition rounded-full hover:bg-slate-800"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Density Toggle */}
          <button
            onClick={() => setIsCompact(!isCompact)}
            className={`p-2.5 rounded-xl border text-xs transition flex items-center gap-1.5 ${
              isCompact 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                : 'bg-[#0B0E14] text-slate-400 border-[#1E293B] hover:text-slate-200'
            }`}
            title={isCompact ? 'Tampilan Ringkas (Aktif)' : 'Tampilan Standar'}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isCompact ? 'Kompak' : 'Normal'}</span>
          </button>
        </div>

        {/* Status Filter Chips */}
        {statusFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {statusFilters.map((f) => {
              const isActive = activeFilter === f;
              const count = counts[f] || 0;
              return (
                <button
                  key={f}
                  onClick={() => {
                    setActiveFilter(f);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border ${getFilterStyle(f, isActive)}`}
                >
                  <span>{f}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-black/30 font-bold' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-2xl border border-[#1E293B] bg-[#121824]/90 shadow-2xl">
        <table className="min-w-full divide-y divide-[#1E293B]">
          <thead className="bg-[#0B0E14] text-slate-300 uppercase text-[11px] tracking-wider font-semibold sticky top-0 z-10">
            <tr>
              {columns.map((col) => {
                const isSorted = sortConfig.key === col.key;
                const alignClass =
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                    ? 'text-center'
                    : 'text-left';

                return (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={`${isCompact ? 'py-2.5 px-3' : 'py-3.5 px-4'} ${alignClass} whitespace-nowrap ${
                      col.sortable ? 'cursor-pointer select-none hover:bg-[#1A2234] transition' : ''
                    }`}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 ${
                        col.align === 'right' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <span className={isSorted ? 'text-emerald-400 font-bold' : ''}>{col.label}</span>
                      {col.sortable && (
                        <span className="inline-flex items-center">
                          {isSorted ? (
                            sortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-600 group-hover:text-slate-400" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B]/60 text-xs">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center">
                    <Search className="w-8 h-8 text-slate-600 mb-2 opacity-40" />
                    <p className="text-sm font-medium">Tidak ada data yang sesuai</p>
                    <p className="text-xs text-slate-600 mt-1">Coba sesuaikan kata kunci pencarian atau filter status</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr 
                  key={row.id || row.ticker || idx} 
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-colors duration-150 ${
                    idx % 2 === 0 ? 'bg-transparent' : 'bg-[#0B0E14]/30'
                  } hover:bg-[#1A2234] ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col) => {
                    const alignClass =
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left';
                    return (
                      <td 
                        key={col.key} 
                        className={`${isCompact ? 'py-2 px-3' : 'py-3.5 px-4'} ${alignClass} whitespace-nowrap`}
                      >
                        {col.render ? col.render(row) : (row[col.key] ?? '—')}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4 px-1 text-xs text-slate-400">
        <div>
          Menampilkan{' '}
          <span className="font-bold text-slate-200 font-mono">
            {totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1}
          </span>{' '}
          -{' '}
          <span className="font-bold text-slate-200 font-mono">
            {Math.min(safePage * pageSize, totalItems)}
          </span>{' '}
          dari <span className="font-bold text-slate-200 font-mono">{totalItems}</span> saham
        </div>

        <div className="flex items-center gap-3">
          {/* Page size selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Per halaman:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-[#0B0E14] border border-[#1E293B] text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none font-mono"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1 bg-[#0B0E14] p-1 rounded-xl border border-[#1E293B]">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={safePage <= 1}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 disabled:cursor-not-allowed transition"
              title="Halaman Pertama"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 disabled:cursor-not-allowed transition"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-semibold text-slate-200 font-mono text-[11px]">
              {safePage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 disabled:cursor-not-allowed transition"
              title="Halaman Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={safePage >= totalPages}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 disabled:cursor-not-allowed transition"
              title="Halaman Terakhir"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
