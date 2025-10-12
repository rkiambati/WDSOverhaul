// /api/submit.js
// Appends form rows to CSV in the SAME GitHub repo using the Contents API.
const OWNER  = process.env.GITHUB_OWNER  || process.env.VERCEL_GIT_REPO_OWNER;
const REPO   = process.env.GITHUB_REPO   || process.env.VERCEL_GIT_REPO_SLUG;
const BRANCH = process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || "main";
const TOKEN  = process.env.GITHUB_TOKEN;

async function getFile(path){
  const r = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`, {
    headers: { Authorization: `token ${TOKEN}`, "User-Agent":"wds-overhaul" }
  });
  if(!r.ok) throw new Error(`GET ${path} ${r.status}`);
  return r.json(); // { sha, content(base64) ... }
}

async function putFile(path, content, sha){
  const body = {
    message: `chore: append ${path} [bot]`,
    content: Buffer.from(content).toString("base64"),
    sha,
    branch: BRANCH,
  };
  const r = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`, {
    method: "PUT",
    headers: { Authorization: `token ${TOKEN}`, "User-Agent":"wds-overhaul", "Content-Type":"application/json" },
    body: JSON.stringify(body)
  });
  if(!r.ok) throw new Error(`PUT ${path} ${r.status} ${await r.text()}`);
  return r.json();
}

function csvLine(values){
  const esc = v => `"${String(v ?? "").replace(/"/g,'""')}"`;
  return values.map(esc).join(",") + "\n";
}

export default async function handler(req, res){
  // CORS (allow from your site only)
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Vary","Origin");
  res.setHeader("Access-Control-Allow-Methods","POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  if(req.method === "OPTIONS") return res.status(200).end();

  if(req.method !== "POST") return res.status(405).json({error:"Method not allowed"});

  try{
    const { kind, data } = req.body || {};
    if(!kind || typeof data !== "object") return res.status(400).json({error:"Bad payload"});

    const ua = req.headers["user-agent"] || "";
    const ip = (req.headers["x-forwarded-for"] || "").split(",")[0] || req.socket?.remoteAddress || "";

    let path, line;

    if(kind === "waitlist"){
      path = "data/waitlist.csv";
      const { name, email, role, note, honey } = data;
      if(honey) return res.status(200).json({ ok:true, bot:true });
      if(!name || !email || !role) return res.status(400).json({error:"Missing fields"});
      line = csvLine([new Date().toISOString(), name, email, role, note || "", ua, ip]);
    } else if(kind === "sponsor"){
      path = "data/sponsors.csv";
      const { org, name, email, phone, subject, message, budget, interests, honey } = data;
      if(honey) return res.status(200).json({ ok:true, bot:true });
      if(!org || !name || !email) return res.status(400).json({error:"Missing fields"});
      line = csvLine([new Date().toISOString(), org, name, email, phone||"", subject||"", message||"", budget||"", interests||"", ua, ip]);
    } else {
      return res.status(400).json({error:"Unknown kind"});
    }

    // Fetch → append → PUT (retry if race)
    for(let tries=0; tries<3; tries++){
      const meta = await getFile(path);
      const current = Buffer.from(meta.content, "base64").toString("utf8");
      const next = current + line;
      try{
        await putFile(path, next, meta.sha);
        return res.status(200).json({ ok:true });
      }catch(e){
        // 409 means SHA conflict; retry
        if(String(e).includes("409") && tries<2) continue;
        throw e;
      }
    }
  }catch(err){
    console.error(err);
    return res.status(500).json({error:"Server error"});
  }
}
