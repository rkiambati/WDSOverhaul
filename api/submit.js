// /api/submit.js — append to CSV in repo via GitHub Contents API (no IP/UA)

const OWNER  = process.env.GITHUB_OWNER  || process.env.VERCEL_GIT_REPO_OWNER || process.env.github_owner;
const REPO   = process.env.GITHUB_REPO   || process.env.VERCEL_GIT_REPO_SLUG  || process.env.github_repo;
const BRANCH = process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || process.env.github_branch || "main";
const TOKEN  = process.env.GITHUB_TOKEN  || process.env.github_token;

function cors(req, res){
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods","POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
}

function repoPath(kind){
  if (kind === "waitlist") return "data/waitlist.csv";
  if (kind === "sponsor")  return "data/sponsors.csv";
  return null;
}

// headers we’ll create if the file is missing
const HEADERS = {
  waitlist: "timestamp,name,email,role,note\n",
  sponsor:  "timestamp,org,name,email,phone,subject,message,budget,interests\n"
};

function nowIso(){
  return new Date().toISOString();
}

// very small CSV escaper
function csvCell(v){
  let s = (v ?? "").toString().replace(/\r?\n/g, " ");
  if (/[",]/.test(s)) s = '"' + s.replace(/"/g,'""') + '"';
  return s;
}

async function getFile(owner, repo, branch, path){
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`;
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "User-Agent": "wds-overhaul",
      Accept: "application/vnd.github+json"
    }
  });
  if (r.status === 404) return { status:404 };
  if (!r.ok) return { status:r.status, error: await r.text() };
  const meta = await r.json();
  return {
    status: 200,
    sha: meta.sha,
    content: Buffer.from(meta.content, "base64").toString("utf8")
  };
}

async function putFile(owner, repo, branch, path, content, sha, message){
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
  const body = {
    message,
    content: Buffer.from(content, "utf8").toString("base64"),
    branch,
    ...(sha ? { sha } : {})
  };
  const r = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "User-Agent": "wds-overhaul",
      Accept: "application/vnd.github+json",
      "Content-Type":"application/json"
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) return { status:r.status, error: await r.text() };
  return { status:200 };
}

module.exports = async (req, res) => {
  cors(req,res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")  return res.status(405).json({ error:"POST only" });

  const kind = (req.query.kind || "").trim();
  const path = repoPath(kind);
  if (!path) return res.status(400).json({ error:"Bad kind" });

  if (!OWNER || !REPO || !TOKEN){
    return res.status(500).json({ error:"Server not configured (owner/repo/token missing)" });
  }

  let data;
  try{
    data = req.body && typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
  }catch(e){
    return res.status(400).json({ error:"Invalid JSON body" });
  }

  // Normalize fields from your forms
  if (kind === "waitlist"){
    const name  = (data.name  || "").trim();
    const email = (data.email || "").trim();
    const role  = (data.discipline || data.role || "").trim(); // your form uses discipline
    const note  = (data.notes || data.note || "").trim();
    if (!name || !email){
      return res.status(400).json({ error:"Missing fields for waitlist (name,email)" });
    }

    // Build row
    const row = [
      csvCell(nowIso()),
      csvCell(name),
      csvCell(email),
      csvCell(role),
      csvCell(note)
    ].join(",") + "\n";

    try{
      let file = await getFile(OWNER, REPO, BRANCH, path);
      let nextContent, sha;

      if (file.status === 404){
        nextContent = HEADERS.waitlist + row;
      } else if (file.status === 200){
        sha = file.sha;
        nextContent = file.content.endsWith("\n") ? (file.content + row) : (file.content + "\n" + row);
      } else {
        return res.status(500).json({ error:file.error || `Fetch failed (${file.status})` });
      }

      const put = await putFile(OWNER, REPO, BRANCH, path, nextContent, sha, `append waitlist ${name}`);
      if (put.status !== 200) return res.status(500).json({ error: put.error || "Update failed" });

      return res.status(200).json({ ok:true });
    }catch(err){
      return res.status(500).json({ error:String(err.message || err) });
    }
  }

  if (kind === "sponsor"){
    // accept org/company; hiring interests can be "hiring" or "interests"
    const org     = (data.org || data.company || "").trim();
    const name    = (data.name  || "").trim();
    const email   = (data.email || "").trim();
    const phone   = (data.phone || "").trim();
    const subject = (data.subject || "").trim();
    const message = (data.message || "").trim();
    const budget  = (data.budget  || "").trim();
    const interests = (data.hiring || data.interests || "").trim();

    if (!org || !name || !email){
      return res.status(400).json({ error:"Missing fields for sponsor (org,name,email)" });
    }

    const row = [
      csvCell(nowIso()),
      csvCell(org),
      csvCell(name),
      csvCell(email),
      csvCell(phone),
      csvCell(subject),
      csvCell(message),
      csvCell(budget),
      csvCell(interests)
    ].join(",") + "\n";

    try{
      let file = await getFile(OWNER, REPO, BRANCH, path);
      let nextContent, sha;

      if (file.status === 404){
        nextContent = HEADERS.sponsor + row;
      } else if (file.status === 200){
        sha = file.sha;
        nextContent = file.content.endsWith("\n") ? (file.content + row) : (file.content + "\n" + row);
      } else {
        return res.status(500).json({ error:file.error || `Fetch failed (${file.status})` });
      }

      const put = await putFile(OWNER, REPO, BRANCH, path, nextContent, sha, `append sponsor ${org}`);
      if (put.status !== 200) return res.status(500).json({ error: put.error || "Update failed" });

      return res.status(200).json({ ok:true });
    }catch(err){
      return res.status(500).json({ error:String(err.message || err) });
    }
  }

  return res.status(400).json({ error:"Unknown kind" });
};
