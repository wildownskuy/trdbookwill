// models/screening.js
// Model typedefs untuk screening data (JSDoc valid JS)
// =========================================================

/**
 * @typedef {Object} ScreeningRow
 * @property {number} id
 * @property {string} tanggal
 * @property {string} ticker
 * @property {string} hari
 * @property {boolean} is_friday
 * @property {number} open_s1
 * @property {number} close_s1
 * @property {number} high_s1
 * @property {number} low_s1
 * @property {number} rsi_s1
 * @property {number} s1_body_pct
 * @property {number} vol_spike_ratio
 * @property {number} bull_candle_ratio
 * @property {number} freq_s1
 * @property {boolean} rule1_match
 * @property {boolean} rule2_match
 * @property {boolean} rule3_match
 * @property {number|null} open_s2
 * @property {number|null} gap_pct
 * @property {'BUY'|'SKIP'|'PENDING'|null} entry_decision
 * @property {number|null} entry_price
 * @property {number|null} close_s2
 * @property {number|null} profit_pct
 * @property {'WIN'|'LOSS'|'FLAT'|'PENDING'|null} result
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} DailyStats
 * @property {string} tanggal
 * @property {number} total_screened
 * @property {number} total_rule1_match
 * @property {number} total_buy
 * @property {number} total_skip
 * @property {number} total_win
 * @property {number} total_loss
 * @property {number} total_flat
 * @property {number} win_rate_harian
 * @property {number} avg_profit_harian
 * @property {number} cum_total_trades
 * @property {number} cum_total_wins
 * @property {number} cum_profit_sum
 * @property {number} win_rate_all_time
 * @property {number} avg_profit_all_time
 * @property {string} created_at
 */

/**
 * @typedef {Object} DashboardSummary
 * @property {number} win_rate_harian
 * @property {number} win_rate_all_time
 * @property {number} cum_total_trades
 * @property {number} cum_total_wins
 * @property {number} avg_profit_harian
 * @property {number} avg_profit_all_time
 * @property {number} total_today
 * @property {number} total_wins_today
 */

export const DEFAULT_SUMMARY = {
  win_rate_harian: 0,
  win_rate_all_time: 0,
  cum_total_trades: 0,
  cum_total_wins: 0,
  avg_profit_harian: 0,
  avg_profit_all_time: 0,
  total_today: 0,
  total_wins_today: 0,
};