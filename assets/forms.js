/* assets/forms.js — POST to serverless API */
async function postEntry(kind, data){
  const r = await fetch("./api/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, data })
  });
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}
