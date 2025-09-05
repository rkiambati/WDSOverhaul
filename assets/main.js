// Smooth anchor focus for accessibility
document.querySelectorAll('.nav-links a').forEach(a=>{
  a.addEventListener('click', e=>{
    const id = a.getAttribute('href') || '';
    if(id.startsWith('#')){
      const el = document.querySelector(id);
      if(el){ el.setAttribute('tabindex','-1'); el.focus({preventScroll:true}); }
    }
  });
});

// FAQ accordion
document.querySelectorAll('[data-accordion]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const item = btn.closest('.faq-item');
    item.classList.toggle('open');
  });
});

// Waitlist button (replace with your form URL when ready)
document.getElementById('waitlist')?.addEventListener('click', (e)=>{
  // e.preventDefault();
  // location.href = 'https://forms.gle/your-waitlist';
});
