// /api/list.js — returns CSV contents from GitHub for owner view
const OWNER  = process.env.GITHUB_OWNER  || process.env.VERCEL_GIT_REPO_OWNER;
const REPO   = process.env.GITHUB_REPO   || process.env.VERCEL_GIT_REPO_SLUG;
const BRANCH = process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || "main";
const TOKEN  = process.env.GITHUB_TOKEN;
const ADMIN_KEY = process.env.ADMIN_KEY; // set this in Vercel → Env Vars

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
        ? "timestamp,name,email,role,note,ua,ip\n"
        : "timestamp,org,name,email,phone,subject,message,budget,interests,ua,ip\n";
      return res.status(200).send(header); // empty CSV with header
    }
    res.status(200).send(content);
  }catch(e){
    console.error(e);
    res.status(500).json({ error:String(e) });
  }
};
