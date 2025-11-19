// Serverless function: POST /api/submit
// Accepts { kind: 'waitlist'|'sponsor', data: {...} } and appends a line to the
// corresponding CSV in your GitHub repo. No IP / UA captured.

const REQUIRED = {
  waitlist: ['name', 'email'],      // keep this minimal; role/discipline are optional
  sponsor:  ['org', 'name', 'email']
};

const {
  GITHUB_TOKEN,
  GH_OWNER,
  GH_REPO,
  GH_WAITLIST_PATH = 'data/waitlist.csv',
  GH_SPONSOR_PATH  = 'data/sponsors.csv'
} = process.env;

const GH_API = 'https://api.github.com';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { kind, data } = await readJson(req);
    if (!kind || !data) return res.status(400).json({ error: 'Bad payload: missing kind/data' });

    // --- normalize incoming fields so older/newer forms still work ---
    let row = sanitize(kind, data);

    // Validate minimal fields
    const missing = REQUIRED[kind]?.filter(k => !String(row[k] ?? '').trim()) || [];
    if (missing.length) {
      return res.status(400).json({ error: `Missing fields for ${kind} (${missing.join(',')})` });
    }

    // Choose CSV file
    const path = kind === 'sponsor' ? GH_SPONSOR_PATH : GH_WAITLIST_PATH;

    // Prepare CSV
    const nowISO = new Date().toISOString();
    row.created_at = nowISO;

    const { text, sha } = await getGhFile(path);
    const { header, line } = toCsv(text, row);

    const updated = (text ? text.trimEnd() + '\n' : header + '\n') + line + '\n';
    await putGhFile(path, updated, sha);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('submit error', err);
    const code = err.status || 500;
    res.status(code).json({ error: err.message || 'Server error' });
  }
}

// ---------- helpers ----------

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks).toString('utf8') || '{}';
  return JSON.parse(body);
}

function sanitize(kind, src) {
  const d = { ...src };

  if (kind === 'sponsor') {
    // Accept old/new names
    d.org   = d.org || d.company || d.organization || '';
    d.name  = d.name || d.contact || d.contact_name || '';
    d.email = d.email || d.contact_email || '';
  }

  if (kind === 'waitlist') {
    // Accept old role -> discipline
    d.role = d.role || d.discipline || '';
  }

  // Booleans -> yes/no text (easier in spreadsheets)
  if (typeof d.consent !== 'undefined') d.consent = d.consent ? 'yes' : 'no';

  return d;
}

function toCsv(existingText, row) {
  // Build header from union of existing header and current keys
  const existingHeader = existingText?.split('\n')[0]?.trim();
  const existingCols = existingHeader ? splitCsv(existingHeader) : [];

  const rowCols = Object.keys(row);
  const cols = Array.from(new Set([...existingCols, ...rowCols]));

  const header = cols.map(safeCsv).join(',');

  // Emit line in header order
  const line = cols.map(c => safeCsv(row[c] ?? '')).join(',');

  return { header, line };
}

function splitCsv(line) {
  // naive split that handles quotes well enough for our fields
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

function safeCsv(v) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function getGhFile(path) {
  const r = await fetch(`${GH_API}/repos/${GH_OWNER}/${GH_REPO}/contents/${encodeURIComponent(path)}`, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' }
  });
  if (r.status === 404) return { text: '', sha: null }; // new file
  if (!r.ok) throw new Error(`GitHub GET ${r.status}`);
  const j = await r.json();
  const text = Buffer.from(j.content, 'base64').toString('utf8');
  return { text, sha: j.sha };
}

async function putGhFile(path, content, sha) {
  const r = await fetch(`${GH_API}/repos/${GH_OWNER}/${GH_REPO}/contents/${encodeURIComponent(path)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' },
    body: JSON.stringify({
      message: `Append ${path}`,
      content: Buffer.from(content, 'utf8').toString('base64'),
      sha
    })
  });
  if (!r.ok) throw new Error(`GitHub PUT ${r.status}`);
}
