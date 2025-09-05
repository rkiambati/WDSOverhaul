// ===== Header glass tweaks + scroll progress
const header = document.getElementById('header');
const progressBar = document.querySelector('.progress span');
const setHeaderState = () => {
  const y = window.scrollY || 0;
  header.classList.toggle('scrolled', y > 6);
  const h = document.documentElement.scrollHeight - window.innerHeight;
  const pct = h > 0 ? (y / h) * 100 : 0;
  progressBar.style.width = pct + '%';
  // Parallax (CSS uses --scrollY in px)
  document.documentElement.style.setProperty('--scrollY', y + 'px');
};
setHeaderState();
window.addEventListener('scroll', setHeaderState, { passive: true });

// ===== Smooth section reveal
const revealEls = document.querySelectorAll('.reveal');
const obs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('in');
      obs.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });
revealEls.forEach(el => obs.observe(el));

// ===== FAQ with buttery height animation
function toggleFAQ(item) {
  const content = item.querySelector('.faq-a');
  const isOpen = item.classList.contains('open');

  if (isOpen) {
    // collapse
    const start = content.scrollHeight;
    content.style.height = start + 'px';
    // next frame
    requestAnimationFrame(() => {
      content.style.height = '0px';
    });
    content.addEventListener('transitionend', function onEnd() {
      item.classList.remove('open');
      content.removeEventListener('transitionend', onEnd);
    });
  } else {
    // close others (classic accordion)
    document.querySelectorAll('.faq-item.open').forEach(o => {
      const c = o.querySelector('.faq-a');
      c.style.height = c.scrollHeight + 'px';
      requestAnimationFrame(() => { c.style.height = '0px'; });
      o.classList.remove('open');
    });
    // expand
    item.classList.add('open');
    const end = content.scrollHeight;
    content.style.height = end + 'px';
    content.addEventListener('transitionend', function onEnd() {
      // allow natural height after animation for responsiveness
      content.style.height = 'auto';
      content.removeEventListener('transitionend', onEnd);
    });
  }
}
document.querySelectorAll('[data-accordion]').forEach(btn => {
  btn.addEventListener('click', () => toggleFAQ(btn.closest('.faq-item')));
});

// ===== Smooth anchor focus for a11y
document.querySelectorAll('.nav-links a').forEach(a=>{
  a.addEventListener('click', e=>{
    const id = a.getAttribute('href') || '';
    if (id.startsWith('#')) {
      const el = document.querySelector(id);
      if (el) { el.setAttribute('tabindex','-1'); el.focus({ preventScroll:true }); }
    }
  });
});

// ===== Waitlist button (swap URL later)
document.getElementById('waitlist')?.addEventListener('click', (e)=>{
  // e.preventDefault();
  // location.href = 'https://forms.gle/your-waitlist';
});
