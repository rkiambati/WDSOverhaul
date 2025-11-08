// assets/forms.js — client-side submit

async function postJSON(url, json){
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify(json),
  });
  let data = null;
  try { data = await r.json(); } catch(e){}
  if (!r.ok) throw new Error((data && data.error) || `HTTP ${r.status}`);
  return data;
}

function byId(id){ return document.getElementById(id); }

// Waitlist form
const wlForm = byId('waitlist-form');
if (wlForm){
  wlForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const fd = new FormData(wlForm);
    const payload = {
      kind: 'waitlist',
      data: {
        name:  fd.get('name')?.trim(),
        email: fd.get('email')?.trim(),
        role:  fd.get('role')?.trim(),
        note:  fd.get('note')?.trim(),
        honey: fd.get('company') || '' // your honeypot input (keep if you have it)
      }
    };
    try{
      const res = await postJSON('/api/submit', payload);
      wlForm.reset();
      alert('Added to waitlist. Thanks!');
    }catch(err){
      console.error(err);
      alert('Could not submit (waitlist): ' + err.message);
    }
  });
}

// Sponsor form
const spForm = byId('sponsor-form');
if (spForm){
  spForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const fd = new FormData(spForm);
    const payload = {
      kind: 'sponsor',
      data: {
        org:      fd.get('org')?.trim(),
        name:     fd.get('name')?.trim(),
        email:    fd.get('email')?.trim(),
        phone:    fd.get('phone')?.trim(),
        subject:  fd.get('subject')?.trim(),
        message:  fd.get('message')?.trim(),
        budget:   fd.get('budget')?.trim(),
        interests:fd.get('interests')?.trim(),
        honey:    fd.get('company') || '' // same honeypot if present
      }
    };
    try{
      const res = await postJSON('/api/submit', payload);
      spForm.reset();
      alert('Sponsor interest submitted. Thank you!');
    }catch(err){
      console.error(err);
      alert('Could not submit (sponsor): ' + err.message);
    }
  });
}
