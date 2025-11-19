// Serverless function: GET /api/list?kind=waitlist|sponsor&key=ADMIN_KEY
// Reads the CSV from GitHub and returns JSON rows (array of objects).

const {
  GITHUB_TOKEN,
  GH_OWNER,
  GH_REPO,
  GH_WAITLIST_PATH = 'data/waitlist.csv',
  GH_SPONSOR_PATH  = 'data/sponsors.csv',
  ADMIN_KEY
} = process.env;

const GH_API = 'https://api.github.com';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const url = new URL(req.url, 'http://x'); // dummy base
    const kind = url.searchParams.get('kind') || 'waitlist';
    const key  = url.searchParams.get('key');

    if (!key || key !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });

    const path = kind === 'sponsor' ? GH_SPONSOR_PATH : GH_WAITLIST_PATH;

    const file = await getGhFile(path);
    if (!file.text) return res.status(200).json([]);

    const rows = parseCsv(file.text);
    res.status(200).json(rows);
  } catch (err) {
    console.error('list error', err);
    const code = err.status || 500;
    res.status(code).json({ error: err.message || 'Server error' });
  }
}

async function getGhFile(path) {
  const r = await fetch(`${GH_API}/repos/${GH_OWNER}/${GH_REPO}/contents/${encodeURIComponent(path)}`, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' }
  });
  if (r.status === 404) return { text: '', sha: null };
  if (!r.ok) throw new Error(`GitHub GET ${r.status}`);
  const j = await r.json();
  const text = Buffer.from(j.content, 'base64').toString('utf8');
  return { text, sha: j.sha };
}

function parseCsv(text) {
  const lines = text.trim().split('\n').filter(Boolean);
  if (!lines.length) return [];
  const header = splitCsv(lines[0]);
  return lines.slice(1).map(line => {
    const cells = splitCsv(line);
    const obj = {};
    header.forEach((h, i) => obj[h] = cells[i] ?? '');
    return obj;
  });
}

function splitCsv(line) {
  const out = [];
  let buf = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { buf += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      out.push(buf); buf = '';
    } else {
      buf += ch;
    }
  }
  out.push(buf);
  return out;
}
