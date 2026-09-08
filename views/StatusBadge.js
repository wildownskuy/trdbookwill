// views/StatusBadge.js
// Komponen badge status sederhana
import React from 'react';

export function StatusBadge({ decision, result }) {
    const decisionClass = decision === 'BUY' 
        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
        : decision === 'SKIP' 
        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30';

    const resultClass = result === 'WIN' 
        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
        : result === 'LOSS' 
        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
        : result === 'FLAT' 
        ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30';

    return (
        <>
            <span className={`${decisionClass} px-2 py-1 rounded-full text-xs font-medium`}>
                {decision || '—'}
            </span>
            <span className={`${resultClass} ml-2 px-2 py-1 rounded-full text-xs font-medium`}>
                {result || '—'}
            </span>
        </>
    );
}