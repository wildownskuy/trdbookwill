// pages/api/cron.js
// API Route untuk trigger GitHub Actions workflow dari cron-job.org
// Pages Router format: export default handler(req, res)
// =========================================================

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use POST or GET.' });
  }

  try {
    // Ambil job dan secret dari query params atau body
    const job = req.query.job || req.body?.job;
    const secret = req.query.secret || req.body?.secret;

    // 1. Validasi secret
    const expectedSecret = process.env.CRON_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
      console.warn('Unauthorized cron request: invalid or missing secret');
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing secret' });
    }

    // 2. Validasi parameter job
    const jobMap = {
      screening: 'screening.yml',
      'check-gap': 'check-gap.yml',
      evaluate: 'evaluate.yml',
    };

    const targetWorkflow = jobMap[job];
    if (!targetWorkflow) {
      return res.status(400).json({ 
        error: `Bad Request: Unknown job '${job}'. Expected one of: screening, check-gap, evaluate` 
      });
    }

    // 3. Konfigurasi GitHub Actions API
    const repoOwner = process.env.GITHUB_OWNER || 'willsurvey';
    const repoName = process.env.GITHUB_REPO || 'tradebook-live-test';
    const githubToken = process.env.GITHUB_TOKEN;

    if (!githubToken) {
      console.error('GITHUB_TOKEN environment variable is not configured');
      return res.status(500).json({ error: 'Server configuration error: GITHUB_TOKEN missing' });
    }

    const githubApiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/${targetWorkflow}/dispatches`;

    const response = await fetch(githubApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        ref: 'main',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API error:', response.status, errorText);
      return res.status(500).json({ 
        error: `GitHub API error: ${response.status}`, 
        detail: errorText 
      });
    }

    // GitHub API mengembalikan 204 No Content saat dispatch sukses
    console.log(`Workflow dispatched successfully: ${targetWorkflow}`);
    return res.status(200).json({
      success: true,
      message: `Cron job "${job}" (${targetWorkflow}) triggered successfully`,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Cron API handler error:', error);
    return res.status(500).json({ 
      error: 'Internal server error: ' + error.message 
    });
  }
}