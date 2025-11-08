
// Small fetch helper that POSTs JSON and throws on non-2xx
async function postJSON(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText} ${text}`);
  }
  return res.json().catch(() => ({}));
}

// Waitlist: map `discipline` → `role` so legacy back-end passes validation
window.submitWaitlist = async (raw) => {
  const payload = {
    type: 'waitlist',
    name: raw.name?.trim(),
    email: raw.email?.trim(),
    school: raw.school?.trim() || '',
    discipline: raw.discipline || '',
    role: raw.discipline || '',          // <-- legacy API expects `role`
    notes: raw.notes?.trim() || '',
    consent: !!raw.consent,
  };
  return postJSON('/api/submit', payload);
};

// --- SPONSOR SUBMIT (with legacy aliases so the old API accepts it) ---
window.submitSponsor = async (raw) => {
  const payload = {
    type: 'sponsor',

    // primary fields
    name: raw.name?.trim(),
    email: raw.email?.trim(),

    // current naming
    company: raw.company?.trim() || '',         // e.g., "Acme"
    role: raw.role?.trim() || '',               // your title
    budget: raw.budget || 'Undisclosed',        // Friendly label (e.g., “$1k–$2.5k”)
    hiring: raw.hiring || 'Both',               // “Yes” / “No” / “Both”
    message: raw.message?.trim() || '',
    consent: !!raw.consent,

    // ---- legacy aliases to satisfy older validators/backends ----
    organization: raw.company?.trim() || '',    // some backends used `organization`
    org: raw.company?.trim() || '',             // some used `org`
    tier: raw.budget || 'Undisclosed',          // some used `tier` instead of `budget`
    recruiting: raw.hiring || 'Both',           // some used `recruiting`
  };

  const res = await fetch('/api/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText} ${text}`);
  }

  return res.json().catch(() => ({}));
};

  return postJSON('/api/submit', payload);
};
