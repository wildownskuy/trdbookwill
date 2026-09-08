// models/dailyStats.js
// Model untuk daily_stats table (JSDoc valid JS)

/**
 * @typedef {Object} DailyStatsRow
 * @property {number} id
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

export const EMPTY_DAILY_STATS = {};