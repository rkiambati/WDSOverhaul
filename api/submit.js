const REQUIRED = {
  waitlist: ['name','email'],
  sponsor:  ['org','name','email'],
};

const {
  GITHUB_TOKEN,
  GH_OWNER,
  GH_REPO,
  GH_BRANCH = 'main',
  GH_WAITLIST_PATH = 'data/waitlist.csv',
  GH_SPONSOR_PATH  = 'data/sponsors.csv'
} = process.env;

const GH_API = 'https://api.github.com';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { kind, data } = await readJson(req);
    if (!kind || !data) return res.status(400).json({ error: 'Bad payload: missing kind/data' });

    const row = normalize(kind, data);
    const missing = REQUIRED[kind].filter(k => !String(row[k] ?? '').trim());
    if (missing.length) return res.status(400).json({ error: `Missing fields for ${kind} (${missing.join(',')})` });

    const path = (kind === 'sponsor') ? GH_SPONSOR_PATH : GH_WAITLIST_PATH;

    row.created_at = new Date().toISOString();

    const { text, sha } = await getGhFile(path);
    const { header, line } = toCsv(text, row);
    const updated = (text ? text.trimEnd() + '\n' : header + '\n') + line + '\n';

    await putGhFile(path, updated, sha);

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('submit error', err);
    res.status(err.status || 500).json({ error: err.message || 'Server error' });
  }
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function normalize(kind, src) {
  const d = { ...src };
  if (kind === 'sponsor') {
    d.org   = d.org || d.company || d.organization || '';
    d.name  = d.name || d.contact || d.contact_name || '';
    d.email = d.email || d.contact_email || '';
  } else if (kind === 'waitlist') {
    d.role = d.role || d.discipline || '';
  }
  if (typeof d.consent !== 'undefined') d.consent = d.consent ? 'yes' : 'no';
  return d;
}

function toCsv(existingText, row) {
  const existingHeader = existingText?.split('\n')[0]?.trim();
  const existingCols = existingHeader ? splitCsv(existingHeader) : [];
  const rowCols = Object.keys(row);
  const cols = Array.from(new Set([...existingCols, ...rowCols]));
  const header = cols.map(csvSafe).join(',');
  const line   = cols.map(c => csvSafe(row[c] ?? '')).join(',');
  return { header, line };
}

function splitCsv(line) {
  const out = [];
  let buf = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i+1] === '"') { buf += '"'; i++; } else quoted = !quoted;
    } else if (ch === ',' && !quoted) { out.push(buf); buf = ''; }
    else buf += ch;
  }
  out.push(buf);
  return out;
}
function csvSafe(v){ const s=String(v??''); return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; }

async function getGhFile(path) {
  const r = await fetch(`${GH_API}/repos/${GH_OWNER}/${GH_REPO}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(GH_BRANCH)}`, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' }
  });
  if (r.status === 404) return { text: '', sha: null };
  if (!r.ok) throw await ghErr('GET', r);
  const j = await r.json();
  return { text: Buffer.from(j.content, 'base64').toString('utf8'), sha: j.sha };
}

async function putGhFile(path, content, sha) {
  const r = await fetch(`${GH_API}/repos/${GH_OWNER}/${GH_REPO}/contents/${encodeURIComponent(path)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' },
    body: JSON.stringify({
      message: `Append ${path}`,
      content: Buffer.from(content, 'utf8').toString('base64'),
      sha,
      branch: GH_BRANCH
    })
  });
  if (!r.ok) throw await ghErr('PUT', r);
}

async function ghErr(verb, r) {
  let msg = `${verb} ${r.status}`;
  try { const j = await r.json(); if (j?.message) msg += `: ${j.message}`; } catch {}
  const e = new Error(`GitHub ${msg}`); e.status = r.status; return e;
}
