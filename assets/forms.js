// Front-end helpers used by waitlist.html and sponsor.html
// Sends normalized payloads to /api/submit (no IP / UA).

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `${res.status}`);
  return text;
}

// Waitlist form helper
window.submitWaitlist = async function submitWaitlist(raw) {
  const data = { ...raw };
  // normalize optional old fields
  data.role = data.role || data.discipline || '';
  data.consent = !!data.consent;
  await postJSON('/api/submit', { kind: 'waitlist', data });
};

// Sponsor form helper
window.submitSponsor = async function submitSponsor(raw) {
  const d = { ...raw };
  // normalize to API keys
  const data = {
    org:   d.org || d.company || d.organization || '',
    name:  d.name || d.contact || d.contact_name || '',
    email: d.email || d.contact_email || '',
    role: d.role || '',
    budget: d.budget || 'Undisclosed',
    hiring: d.hiring || '',
    message: d.message || '',
    consent: !!d.consent
  };
  await postJSON('/api/submit', { kind: 'sponsor', data });
};
