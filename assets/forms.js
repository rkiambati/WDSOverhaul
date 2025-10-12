const WDS_KEYS = {
  waitlist: "wds_waitlist_entries_v1",
  sponsors: "wds_sponsor_entries_v1"
};

function loadEntries(kind){
  const raw = localStorage.getItem(WDS_KEYS[kind] || "");
  return raw ? JSON.parse(raw) : [];
}

function saveEntry(kind, row){
  const arr = loadEntries(kind);
  arr.push({ ...row, _ts: new Date().toISOString() });
  localStorage.setItem(WDS_KEYS[kind], JSON.stringify(arr));
}

function toCSV(rows){
  if(!rows.length) return "timestamp\n";
  const headers = Object.keys(rows[0]);
  const esc = v => `"${String(v ?? "").replace(/"/g,'""')}"`;
  const lines = [headers.join(",")];
  for(const r of rows) lines.push(headers.map(h => esc(r[h])).join(","));
  return lines.join("\n");
}

function downloadCSV(filename, rows){
  const csv = toCSV(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
