// lib/github.js
// Helper functions untuk GitHub API operations

// Konfigurasi repo
export const GITHUB_OWNER = process.env.GITHUB_OWNER || 'wildownskuy';
export const GITHUB_REPO = process.env.GITHUB_REPO || 'trdbookwill';

// Fungsi dispatch workflow
export async function dispatchWorkflow(jobName) {
  const githubToken = process.env.GITHUB_TOKEN || '';
  
  if (!githubToken) {
    console.error('GITHUB_TOKEN not available');
    return null;
  }

  const workflowMap = {
    screening: 'screening.yml',
    'check-gap': 'check-gap.yml',
    evaluate: 'evaluate.yml',
  };

  const workflowFile = workflowMap[jobName];
  if (!workflowFile) {
    console.error(`Unknown workflow job: ${jobName}`);
    return null;
  }

  // GitHub Actions API menerima filename lengkap dengan ekstensi .yml
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${workflowFile}/dispatches`;

  try {
    const response = await fetch(apiUrl, {
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
      return null;
    }

    // GitHub dispatch mengembalikan HTTP 204 No Content (body kosong)
    return { success: true, status: response.status };
  } catch (error) {
    console.error('GitHub dispatch error:', error);
    return null;
  }
}

// Fungsi cek status workflow
export async function checkWorkflowStatus(workflowId) {
  const githubToken = process.env.GITHUB_TOKEN || '';
  
  if (!githubToken) {
    return null;
  }

  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${workflowId}/runs`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github+json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('GitHub status check error:', error);
    return null;
  }
}