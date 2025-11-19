const {
  GITHUB_TOKEN,
  GH_OWNER,
  GH_REPO,
  GH_BRANCH = 'main',
  GH_WAITLIST_PATH = 'data/waitlist.csv',
  GH_SPONSOR_PATH  = 'data/sponsors.csv',
  ADMIN_KEY
} = process.env;

const GH_API = 'https://api.github.com';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const url  = new URL(req.url, 'http://x');
    const kind = url.searchParams.get('kind') || 'waitlist';
    const key  = url.searchParams.get('key');
    if (!key || key !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });

    const path = (kind === 'sponsor') ? GH_SPONSOR_PATH : GH_WAITLIST_PATH;
    const { text } = await getGhFile(path);
    if (!text) return res.status(200).json([]);

    const rows = parseCsv(text);

    // normalize for UI so columns are predictable
    if (kind === 'waitlist') {
      rows.forEach(r => { r.role = r.role || r.discipline || ''; });
    } else {
      rows.forEach(r => {
        r.org   = r.org || r.company || r.organization || '';
        r.name  = r.name || r.contact || r.contact_name || '';
        r.email = r.email || r.contact_email || '';
      });
    }

    res.status(200).json(rows);
  } catch (err) {
    console.error('list error', err);
    res.status(err.status || 500).json({ error: err.message || 'Server error' });
  }
}

async function getGhFile(path) {
  const r = await fetch(`${GH_API}/repos/${GH_OWNER}/${GH_REPO}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(GH_BRANCH)}`, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' }
  });
  if (r.status === 404) return { text: '' };
  if (!r.ok) { const j = await r.json().catch(()=>null); throw new Error(`GitHub GET ${r.status}${j?.message?`: ${j.message}`:''}`); }
  const j = await r.json();
  return { text: Buffer.from(j.content, 'base64').toString('utf8') };
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
function splitCsv(line){const o=[];let b='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c=='"'){if(q&&line[i+1]=='"'){b+='"';i++;}else q=!q;}else if(c==','&&!q){o.push(b);b='';}else b+=c;}o.push(b);return o;}
