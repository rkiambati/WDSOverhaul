// /api/submit.js — append rows to GitHub CSVs (no IP/UA collection)
const OWNER  = process.env.GITHUB_OWNER  || process.env.VERCEL_GIT_REPO_OWNER;
const REPO   = process.env.GITHUB_REPO   || process.env.VERCEL_GIT_REPO_SLUG;
const BRANCH = process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || "main";
const TOKEN  = process.env.GITHUB_TOKEN; 

// Canonical headers (no ua/ip)
const HEADERS = {
  waitlist: "timestamp,name,email,role,note\n",
  sponsors: "timestamp,org,name,email,phone,subject,message,budget,interests\n",
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
    req.on("end", ()=>{ try{ resolve(b?JSON.parse(b):{}); } catch(e){ reject(e); }});
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
  const text = await r.text();
  if (!r.ok) throw new Error(`GitHub PUT ${r.status} ${text}`);
  try { return JSON.parse(text); } catch { return { ok:true }; }
}


function normalizePayload(body){
  // Accept either { kind, data } or { type, payload } or a flat body from older forms
  const kind = body.kind || body.type || body.form || body.section;
  const data = body.data || body.payload || body;

  if (!kind || typeof data !== "object") return { error:"Bad payload: missing kind/data" };

  if (kind === "waitlist"){
    const { name, email, role, note, honey } = data;
    if (honey) return { bot:true, kind, path:"data/waitlist.csv", row:null };
    if (!name || !email || !role) return { error:"Missing fields for waitlist (name,email,role)" };
    const row = line([new Date().toISOString(), name, email, role, note || ""]);
    return { kind, path:"data/waitlist.csv", row };
  }

  if (kind === "sponsor" || kind === "sponsors"){
    const { org, name, email, phone, subject, message, budget, interests, honey } = data;
    if (honey) return { bot:true, kind:"sponsor", path:"data/sponsors.csv", row:null };
    if (!org || !name || !email) return { error:"Missing fields for sponsor (org,name,email)" };
    const row = line([new Date().toISOString(), org, name, email, phone||"", subject||"", message||"", budget||"", interests||""]);
    return { kind:"sponsor", path:"data/sponsors.csv", row };
  }

  return { error:`Unknown kind: ${kind}` };
}

module.exports = async (req, res) => {
  setCors(req,res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error:"Method not allowed" });
  if (!TOKEN || !OWNER || !REPO) return res.status(500).json({ error:"Server not configured (token/owner/repo)" });

  try{
    const body = await readJson(req);
    const norm = normalizePayload(body);
    if (norm.bot)   return res.status(200).json({ ok:true, bot:true });
    if (norm.error) return res.status(400).json({ error:norm.error });

    const { path, row } = norm;

    // read current
    let sha = null, current = "";
    const r0 = await ghGet(path);
    if (r0.status === 200){
      const meta = await r0.json();
      sha = meta.sha;
      current = Buffer.from(meta.content, "base64").toString("utf8");
      // if file exists with old header containing ua/ip, keep header and still append (we removed those cols)
      if (!current.trim()){
        current = path.includes("waitlist") ? HEADERS.waitlist : HEADERS.sponsors;
      } else if (/^(timestamp,).*ua,ip\s*$/im.test(current.split(/\r?\n/)[0])) {
        // rewrite header to new, keep historical rows as-is
        const lines = current.split(/\r?\n/);
        lines[0] = path.includes("waitlist") ? HEADERS.waitlist.trim() : HEADERS.sponsors.trim();
        current = lines.join("\n");
      }
    } else if (r0.status === 404){
      current = path.includes("waitlist") ? HEADERS.waitlist : HEADERS.sponsors;
    } else {
      return res.status(502).json({ error:`GitHub GET ${r0.status}` });
    }

    await ghPut(path, current + row, sha);
    return res.status(200).json({ ok:true });

  } catch (e){
    console.error(e);
    return res.status(500).json({ error:String(e) });
  }
};
