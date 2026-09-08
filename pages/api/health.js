// pages/api/health.js
// Production Health Check & Monitoring Endpoint
// Bisa dipantau via UptimeRobot, BetterUptime, browser, atau curl
// =========================================================

import { supabase, supabaseUrl } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed. Use GET or HEAD.' });
  }

  const startTime = Date.now();

  try {
    // 1. Verifikasi koneksi ke Supabase Database
    const dbStart = Date.now();
    const { data: dbData, error: dbError } = await supabase
      .from('daily_stats')
      .select('tanggal')
      .order('tanggal', { ascending: false })
      .limit(1);

    const dbLatencyMs = Date.now() - dbStart;
    const isDbConnected = !dbError;

    // Format waktu WIB (Asia/Jakarta)
    const now = new Date();
    const wibTime = now.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'full',
      timeStyle: 'long',
    });

    const isHealthy = isDbConnected;
    const statusCode = isHealthy ? 200 : 503;

    return res.status(statusCode).json({
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp_utc: now.toISOString(),
      timestamp_wib: wibTime,
      latency_total_ms: Date.now() - startTime,
      services: {
        database: {
          status: isDbConnected ? 'connected' : 'disconnected',
          provider: 'Supabase PostgreSQL',
          latency_ms: dbLatencyMs,
          error: dbError ? dbError.message : null,
          last_trading_date: dbData?.[0]?.tanggal || null,
        },
        environment: {
          supabase_url_configured: !supabaseUrl.includes('placeholder-project'),
          cron_secret_configured: Boolean(process.env.CRON_SECRET),
          github_token_configured: Boolean(process.env.GITHUB_TOKEN),
        },
      },
    });
  } catch (error) {
    console.error('Health check exception:', error);
    return res.status(500).json({
      status: 'unhealthy',
      timestamp_utc: new Date().toISOString(),
      error: error.message || 'Internal error during health check',
    });
  }
}
