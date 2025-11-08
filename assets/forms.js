// --- helper: first non-empty value among possible keys
const pick = (fd, ...keys) => {
  for (const k of keys) {
    const v = fd.get(k);
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
};

// Waitlist form (accepts #waitlist-form or [data-form="waitlist"])
const wlForm = document.querySelector('#waitlist-form, form[data-form="waitlist"]');
if (wlForm){
  wlForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const fd = new FormData(wlForm);

    // Accept common variants
    const name  = pick(fd, 'name', 'fullName', 'wl-name', 'user');
    const email = pick(fd, 'email', 'wl-email', 'mail');
    const role  = pick(fd, 'role', 'track', 'interest', 'wl-role');
    const note  = pick(fd, 'note', 'message', 'wl-note');

    const payload = {
      kind: 'waitlist',
      data: { name, email, role, note, honey: pick(fd, 'company', 'website') }
    };

    try{
      const r = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(payload)
      });
      const j = await r.json().catch(()=>null);
      if (!r.ok) throw new Error((j && j.error) || `HTTP ${r.status}`);

      wlForm.reset();
      alert('Added to waitlist. Thanks!');
    }catch(err){
      alert('Could not submit (waitlist): ' + err.message);
    }
  });
}
