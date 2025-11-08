// --- helper: first non-empty value among possible keys
const pick = (fd, ...keys) => {
  for (const k of keys) {
    const v = fd.get(k);
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
};

// --- WAITLIST --------------------------------------------------------------
const wlForm = document.getElementById('waitlist-form');

if (wlForm) {
  wlForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fd = new FormData(wlForm);
    const name  = (fd.get('name') || '').trim();
    const email = (fd.get('email') || '').trim();

    // Map field names -> what the API expects
    const role  = (fd.get('discipline') || '').trim();  // role expected, discipline provided
    const note  = (fd.get('notes') || '').trim();       // note expected, notes provided

    // Optional fields (not required by API)
    const school  = (fd.get('school') || '').trim();
    const consent = !!fd.get('consent');

    if (!name || !email) {
      alert('Please provide your name and email.');
      return;
    }

    const payload = {
      kind: 'waitlist',
      data: {
        name,
        email,
        role,     // mapped from discipline
        note,     // mapped from notes
        // extras are fine to send; backend can ignore them
        school,
        consent
      }
    };

    try {
      const r = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error((j && j.error) || `HTTP ${r.status}`);

      wlForm.reset();
      document.getElementById('wl-success')?.removeAttribute('hidden');
      setTimeout(() => document.getElementById('wl-success')?.setAttribute('hidden', ''), 3500);
    } catch (err) {
      alert('Could not submit (waitlist): ' + err.message);
    }
  });
}
