// /api/list.js — CSV fetcher with demo key + robust fallbacks

/* ====== TEMP DEMO KEY  ==============================================
   Use for the demo. Type the same value in admin.html.
   Remove after the demo and rely only on ADMIN_KEY/admin_key env vars.
===================================================================== */
const TEMP_DEMO_KEY = "WDSdemo2025";
// ====================================================================

// Env detection (support both UPPER and lower names)
const OWNER  = process.env.GITHUB_OWNER  || process.env.VERCEL_GIT_REPO_OWNER || process.env.github_owner;
const REPO   = process.env.GITHUB_REPO   || process.env.VERCEL_GIT_REPO_SLUG  || process.env.github_repo;
const BRANCH = process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || process.env.github_branch || "main";
const TOKEN  = process.env.GITHUB_TOKEN  || process.env.github_token;

// Prefer env ADMIN_KEY; if missing, use the demo key
const ADMIN_KEY = (process.env.ADMIN_KEY || process.env.admin_key || "").trim() || TEMP_DEMO_KEY;

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
  const lines = (csv || "").split(/\r?\n/);
  if (!lines.length) return csv;
  const head = lines[0].toLowerCase();
  if (!head.includes(",ua,ip")) return csv;

  const trim = line=>{
    if (!line) return line;
    const cols=[]; let cur="", q=false;
    for (let i=0;i<line.length;i++){
      const c=line[i];
      if (c === '"' && line[i-1] !== "\\") q=!q;
      if (c === "," && !q){ cols.push(cur); cur=""; } else cur+=c;
    }
    cols.push(cur);
    // drop last two columns (ua, ip)
    return cols.slice(0, Math.max(cols.length-2,0)).join(",");
  };

  return [trim(lines[0]).replace(/,?ua,?ip$/i,"")]
    .concat(lines.slice(1).map(trim))
    .join("\n");
}

async function ghApiGet(owner, repo, branch, repoPath){
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${repoPath}?ref=${encodeURIComponent(branch)}`;
  const r = await fetch(url, {
    headers: {
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      "User-Agent": "wds-overhaul",
      Accept: "application/vnd.github+json",
    }
  });
  if (r.status === 404) return { status:404 };
  if (!r.ok) return { status:r.status, error: await r.text() };
  const meta = await r.json();
  const csv  = Buffer.from(meta.content, "base64").toString("utf8");
  return { status:200, content:csv };
}

async function ghRawGet(owner, repo, branch, repoPath){
  // For public repos (no token)
  const raw = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${repoPath}`;
  const r = await fetch(raw);
  if (r.status === 404) return { status:404 };
  if (!r.ok) return { status:r.status, error: await r.text() };
  const csv = await r.text();
  return { status:200, content:csv };
}

module.exports = async (req, res) => {
  cors(req,res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const { kind, key, diag } = req.query || {};

  if (diag === "1"){
    return res.status(200).json({
      ok: true,
      owner: OWNER || null,
      repo: REPO || null,
      branch: BRANCH || null,
      kind,
      path: pathFor(kind),
      hasToken: !!TOKEN,
      keyConfigured: !!ADMIN_KEY
    });
  }

  try{
    // Auth: demo/admin key
    if (!ADMIN_KEY) return res.status(500).json({ error:"No admin key configured" });
    if ((key || "").trim() !== ADMIN_KEY) return res.status(401).json({ error:"Unauthorized" });

    // Inputs
    const repoPath = pathFor(kind);
    if (!repoPath) return res.status(400).json({ error:"Bad kind" });
    if (!OWNER || !REPO) {
      // Still allow demo: return empty header so UI loads
      const header =
        kind === "waitlist"
          ? "timestamp,name,email,role,note\n"
          : "timestamp,org,name,email,phone,subject,message,budget,interests\n";
      return res.status(200).send(header);
    }

    // 1) Try GitHub API (with token if present)
    let out = await ghApiGet(OWNER, REPO, BRANCH, repoPath);

    // 2) If API fails (401/403 etc.), try raw URL (public repos)
    if (out.status !== 200) {
      out = await ghRawGet(OWNER, REPO, BRANCH, repoPath);
    }

    // 3) If still not found, return a header so the admin UI shows an empty table
    if (out.status === 404){
      const header =
        kind === "waitlist"
          ? "timestamp,name,email,role,note\n"
          : "timestamp,org,name,email,phone,subject,message,budget,interests\n";
      return res.status(200).send(header);
    }

    if (out.status !== 200){
      // Last resort: surface the error
      return res.status(500).json({ error: out.error || `Git fetch failed (${out.status})` });
    }

    return res.status(200).send(stripUaIp(out.content));
  }catch(err){
    console.error("[/api/list] error:", err);
    return res.status(500).json({ error: String(err.message || err) });
  }
};
