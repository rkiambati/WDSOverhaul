// /api/list.js — returns CSV contents from GitHub for owner view
const OWNER  = process.env.GITHUB_OWNER  || process.env.VERCEL_GIT_REPO_OWNER;
const REPO   = process.env.GITHUB_REPO   || process.env.VERCEL_GIT_REPO_SLUG;
const BRANCH = process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || "main";
const TOKEN  = process.env.GITHUB_TOKEN;
const ADMIN_KEY = process.env.ADMIN_KEY;

function setCors(req, res){
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Vary","Origin");
  res.setHeader("Access-Control-Allow-Methods","GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
}
async function ghGet(path){
  const r = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, "User-Agent":"wds-overhaul" }
  });
  if (r.status === 404) return { status: 404 };
  if (!r.ok) throw new Error(`GitHub GET ${r.status} ${await r.text()}`);
  const meta = await r.json();
  const content = Buffer.from(meta.content, "base64").toString("utf8");
  return { status: 200, content };
}

// strips last two columns if they look like ua,ip
function stripUaIp(csv){
  const lines = csv.split(/\r?\n/);
  if (!lines.length) return csv;

  const header = lines[0].toLowerCase();
  const looksLikeOld =
    header.includes(",ua,ip") || header.endsWith(",ua,ip");

  if (!looksLikeOld) return csv;

  const trim = line => {
    if (!line) return line;
    // remove last two CSV columns (naive but effective for this case)
    const parts = [];
    let cur = "", q = false;
    for (let i=0;i<line.length;i++){
      const c = line[i];
      if (c === '"' && line[i-1] !== '\\') q = !q;
      if (c === ',' && !q) { parts.push(cur); cur = ""; } else cur += c;
    }
    parts.push(cur);
    return parts.slice(0, Math.max(parts.length-2, 0)).join(",");
  };

  const cleaned = [ trim(lines[0]).replace(/,?ua,?ip$/i,"") ]
    .concat(lines.slice(1).map(trim))
    .join("\n");

  return cleaned;
}

module.exports = async (req, res) => {
  setCors(req,res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!TOKEN || !OWNER || !REPO) return res.status(500).json({ error:"Server not configured" });

  const { kind, key } = req.query || {};
  if (!ADMIN_KEY) return res.status(500).json({ error:"ADMIN_KEY not set" });
  if (key !== ADMIN_KEY) return res.status(401).json({ error:"Unauthorized" });

  let path;
  if (kind === "waitlist") path = "data/waitlist.csv";
  else if (kind === "sponsor") path = "data/sponsors.csv";
  else return res.status(400).json({ error:"Bad kind" });

  try{
    const { status, content } = await ghGet(path);
    if (status === 404) {
      const header = kind === "waitlist"
        ? "timestamp,name,email,role,note\n"
        : "timestamp,org,name,email,phone,subject,message,budget,interests\n";
      return res.status(200).send(header); // empty CSV with new header
    }
    // never return ua/ip even if older rows have them
    res.status(200).send(stripUaIp(content));
  }catch(e){
    console.error(e);
    res.status(500).json({ error:String(e) });
  }
};
