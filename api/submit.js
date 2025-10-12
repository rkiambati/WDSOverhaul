// /api/submit.js — writes rows into data/*.csv in this repo
const OWNER  = process.env.GITHUB_OWNER  || process.env.VERCEL_GIT_REPO_OWNER;
const REPO   = process.env.GITHUB_REPO   || process.env.VERCEL_GIT_REPO_SLUG;
const BRANCH = process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || "main";
const TOKEN  = process.env.GITHUB_TOKEN; // must have Contents: Read & Write

const HEADERS = {
  waitlist: "timestamp,name,email,role,note,ua,ip\n",
  sponsors: "timestamp,org,name,email,phone,subject,message,budget,interests,ua,ip\n",
};

function setCors(req, res){
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
const esc = v => `"${String(v ?? "").replace(/"/g,'""')}"`;
const line = arr => arr.map(esc).join(",") + "\n";

function readJson(req){
  return new Promise((resolve, reject)=>{
    let b=""; req.on("data",c=>b+=c);
    req.on("end", ()=>{ try{ resolve(b?JSON.parse(b):{}); } catch{ reject(new Error("Invalid JSON")); }});
    req.on("error", reject);
  });
}

async function ghGet(path){
  return fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, "User-Agent":"wds-overhaul" }
  });
}
async function ghPut(path, content, sha){
  const body = { message:`chore: append ${path} [bot]`, content: Buffer.from(content).toString("base64"), branch: BRANCH };
  if (sha) body.sha = sha;
  const r = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`, {
    method:"PUT",
    headers:{ Authorization:`Bearer ${TOKEN}`, "User-Agent":"wds-overhaul", "Content-Type":"application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`GitHub PUT ${r.status} ${await r.text()}`);
  return r.json();
}

module.exports = async (req, res) => {
  setCors(req,res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (!TOKEN || !OWNER || !REPO) return res.status(500).json({ error:"Server not configured (token/owner/repo)" });
  if (req.method !== "POST") return res.status(405).json({ error:"Method not allowed" });

  try{
    const ua = req.headers["user-agent"] || "";
    const ip = (req.headers["x-forwarded-for"] || "").split(",")[0] || req.socket?.remoteAddress || "";
    const { kind, data } = await readJson(req);
    if (!kind || typeof data !== "object") return res.status(400).json({ error:"Bad payload" });

    let path, row;
    if (kind === "waitlist"){
      const { name, email, role, note, honey } = data;
      if (honey) return res.status(200).json({ ok:true, bot:true });
      if (!name || !email || !role) return res.status(400).json({ error:"Missing fields" });
      path = "data/waitlist.csv";
      row  = line([new Date().toISOString(), name, email, role, note || "", ua, ip]);
    } else if (kind === "sponsor"){
      const { org, name, email, phone, subject, message, budget, interests, honey } = data;
      if (honey) return res.status(200).json({ ok:true, bot:true });
      if (!org || !name || !email) return res.status(400).json({ error:"Missing fields" });
      path = "data/sponsors.csv";
      row  = line([new Date().toISOString(), org, name, email, phone||"", subject||"", message||"", budget||"", interests||"", ua, ip]);
    } else {
      return res.status(400).json({ error:"Unknown kind" });
    }

    // Read current file (or create with header) then append; retry on SHA conflicts.
    let sha = null, current = "";
    const r0 = await ghGet(path);
    if (r0.status === 200){
      const meta = await r0.json();
      sha = meta.sha;
      current = Buffer.from(meta.content, "base64").toString("utf8");
    } else if (r0.status === 404){
      current = HEADERS[path.includes("waitlist") ? "waitlist" : "sponsors"];
    } else {
      return res.status(502).json({ error:`GitHub GET ${r0.status}` });
    }

    for (let tries=0; tries<3; tries++){
      try{
        await ghPut(path, current + row, sha);
        return res.status(200).json({ ok:true });
      }catch(e){
        if (String(e).includes("409") && tries < 2){
          const meta = await (await ghGet(path)).json();
          sha = meta.sha;
          current = Buffer.from(meta.content, "base64").toString("utf8");
          continue;
        }
        console.error("WRITE_FAIL", String(e));
        return res.status(500).json({ error: String(e).slice(0, 400) });
      }
    }
  }catch(err){
    console.error(err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
};


