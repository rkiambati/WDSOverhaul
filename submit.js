// /api/submit.js — Vercel Node function (CommonJS)
const OWNER  = process.env.GITHUB_OWNER  || process.env.VERCEL_GIT_REPO_OWNER;
const REPO   = process.env.GITHUB_REPO   || process.env.VERCEL_GIT_REPO_SLUG;
const BRANCH = process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || "main";
const TOKEN  = process.env.GITHUB_TOKEN; // fine-grained or classic token with Contents: read/write

const HEADERS = {
  waitlist: "timestamp,name,email,role,note,ua,ip\n",
  sponsors: "timestamp,org,name,email,phone,subject,message,budget,interests,ua,ip\n",
};

function setCors(req, res) {
  const origin = req.headers.origin;
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function csvLine(values) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return values.map(esc).join(",") + "\n";
}

async function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

async function ghGet(path) {
  const r = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, "User-Agent": "wds-overhaul" },
  });
  return r;
}

async function ghPut(path, content, sha) {
  const body = {
    message: `chore: append ${path} [bot]`,
    content: Buffer.from(content).toString("base64"),
    branch: BRANCH,
  };
  if (sha) body.sha = sha;

  const r = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "User-Agent": "wds-overhaul",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`GitHub PUT ${r.status} ${await r.text()}`);
  return r.json();
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!TOKEN || !OWNER || !REPO) {
    return res.status(500).json({ error: "Server not configured (TOKEN/OWNER/REPO missing)" });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const ua = req.headers["user-agent"] || "";
    const ip = (req.headers["x-forwarded-for"] || "").split(",")[0] || req.socket?.remoteAddress || "";

    const { kind, data } = await readJson(req);
    if (!kind || typeof data !== "object") return res.status(400).json({ error: "Bad payload" });

    let path, line;
    if (kind === "waitlist") {
      const { name, email, role, note, honey } = data;
      if (honey) return res.status(200).json({ ok: true, bot: true });
      if (!name || !email || !role) return res.status(400).json({ error: "Missing fields" });
      path = "data/waitlist.csv";
      line = csvLine([new Date().toISOString(), name, email, role, note || "", ua, ip]);
    } else if (kind === "sponsor") {
      const { org, name, email, phone, subject, message, budget, interests, honey } = data;
      if (honey) return res.status(200).json({ ok: true, bot: true });
      if (!org || !name || !email) return res.status(400).json({ error: "Missing fields" });
      path = "data/sponsors.csv";
      line = csvLine([
        new Date().toISOString(),
        org,
        name,
        email,
        phone || "",
        subject || "",
        message || "",
        budget || "",
        interests || "",
        ua,
        ip,
      ]);
    } else {
      return res.status(400).json({ error: "Unknown kind" });
    }

    // Read current file (or create if missing)
    let sha = null;
    let current = "";
    let r = await ghGet(path);
    if (r.status === 200) {
      const meta = await r.json();
      sha = meta.sha;
      current = Buffer.from(meta.content, "base64").toString("utf8");
    } else if (r.status === 404) {
      current = HEADERS[path.includes("waitlist") ? "waitlist" : "sponsors"];
    } else {
      return res.status(502).json({ error: `GitHub GET ${r.status}` });
    }

    // Try to append (retry on SHA conflict)
    for (let tries = 0; tries < 3; tries++) {
      try {
        await ghPut(path, current + line, sha);
        return res.status(200).json({ ok: true });
      } catch (e) {
        // If SHA conflict, re-get and retry once/twice
        if (String(e).includes("409") && tries < 2) {
          const meta = await (await ghGet(path)).json();
          sha = meta.sha;
          current = Buffer.from(meta.content, "base64").toString("utf8");
          continue;
        }
        console.error(e);
        return res.status(500).json({ error: "GitHub write failed" });
      }
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
};

