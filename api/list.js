// /api/list.js — CSV fetcher (with TEMP hardcoded key fallback)

/* ====== TEMP DEMO KEY  ==============================================
   For your show & tell. Type this same value on admin.html.
   REMOVE this after the demo and rely on the ADMIN_KEY env var only.
===================================================================== */
const TEMP_DEMO_KEY = "1234567";
// ====================================================================

const OWNER  = process.env.GITHUB_OWNER  || process.env.VERCEL_GIT_REPO_OWNER;
const REPO   = process.env.GITHUB_REPO   || process.env.VERCEL_GIT_REPO_SLUG;
const BRANCH = process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || "main";
const TOKEN  = process.env.GITHUB_TOKEN;
const ADMIN_KEY = (process.env.ADMIN_KEY && process.env.ADMIN_KEY.trim()) || TEMP_DEMO_KEY;

function cors(req, res){
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Vary","Origin");
  res.setHeader("Access-Control-Allow-Methods","GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
}
function pathFor(kind){
  if (kind === "waitlist") return "data/waitlist.csv";
  if (kind === "sponsor")  return "data/sponsors.csv";
  return null;
}
function stripUaIp(csv){
  const lines = csv.split(/\r?\n/);
  if (!lines.length) return csv;
  const head = lines[0].toLowerCase();
  if (!head.includes(",ua,ip")) return csv;

  const trim = line=>{
    if (!line) return line;
    const out=[]; let cur="", q=false;
    for (let i=0;i<line.length;i++){
      const c=line[i];
      if (c === '"' && line[i-1] !== "\\") q=!q;
      if (c === "," && !q){ out.push(cur); cur=""; } else cur+=c;
    }
    out.push(cur);
    return out.slice(0, Math.max(out.length-2,0)).join(",");
  };
  return [trim(lines[0]).replace(/,?ua,?ip$/i,"")]
    .concat(lines.slice(1).map(trim))
    .join("\n");
}
async function ghGet(owner, repo, branch, repoPath){
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${repoPath}?ref=${encodeURIComponent(branch)}`;
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "User-Agent": "wds-overhaul",
      Accept: "application/vnd.github+json",
    }
  });
  if (r.status === 404) return { status:404 };
  if (!r.ok){
    const body = await r.text();
    throw new Error(`GitHub GET ${r.status} ${body}`);
  }
  const meta = await r.json();
  const csv  = Buffer.from(meta.content, "base64").toString("utf8");
  return { status:200, content:csv };
}

module.exports = async (req, res) => {
  cors(req,res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const { kind, key, diag } = req.query || {};

  if (diag === "1"){
    return res.status(200).json({
      ok: true,
      hasToken: !!TOKEN,
      owner: OWNER || null,
      repo: REPO || null,
      branch: BRANCH || null,
      kind,
      path: pathFor(kind)
    });
  }

  try{
    // 🔐 Accept either real ADMIN_KEY (preferred) or the TEMP fallback
    if (!ADMIN_KEY) return res.status(500).json({ error:"No admin key configured" });
    if ((key || "").trim() !== ADMIN_KEY) return res.status(401).json({ error:"Unauthorized" });

    if (!TOKEN) return res.status(500).json({ error:"GITHUB_TOKEN not set" });
    if (!OWNER || !REPO) return res.status(500).json({ error:"OWNER/REPO not detected; set GITHUB_OWNER and GITHUB_REPO" });

    const repoPath = pathFor(kind);
    if (!repoPath) return res.status(400).json({ error:"Bad kind" });

    const { status, content } = await ghGet(OWNER, REPO, BRANCH, repoPath);

    if (status === 404){
      const header =
        kind === "waitlist"
          ? "timestamp,name,email,role,note\n"
          : "timestamp,org,name,email,phone,subject,message,budget,interests\n";
      return res.status(200).send(header);
    }

    return res.status(200).send(stripUaIp(content));
  }catch(err){
    console.error("[/api/list] error:", err);
    return res.status(500).json({ error: String(err.message || err) });
  }
};
