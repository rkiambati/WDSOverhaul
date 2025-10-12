// assets/forms.js
window.postEntry = async function(kind, data) {
  const r = await fetch("/api/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, data })
  });
  const text = await r.text();
  let payload;
  try { payload = JSON.parse(text); } catch { payload = { raw: text }; }
  if (!r.ok) {
    const msg = (payload && (payload.error || payload.message)) || `HTTP ${r.status}`;
    throw new Error(msg);
  }
  return payload;
};
