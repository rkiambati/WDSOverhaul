
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

// Sponsor: unchanged
window.submitSponsor = async (raw) => {
  const payload = {
    type: 'sponsor',
    name: raw.name?.trim(),
    email: raw.email?.trim(),
    company: raw.company?.trim(),
    role: raw.role?.trim() || '',
    budget: raw.budget || 'Undisclosed',
    hiring: raw.hiring || 'Both',
    message: raw.message?.trim() || '',
    consent: !!raw.consent,
  };
  return postJSON('/api/submit', payload);
};
