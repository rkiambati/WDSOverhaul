// ===== utilities
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ===== header scroll + progress
const header = document.getElementById('header');
const progressBar = document.querySelector('.progress span');
function onScroll() {
  const y = window.scrollY || 0;
  header.classList.toggle('scrolled', y > 6);

  const h = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';

  if (!prefersReduced) parallaxTick();
}
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ===== reveal on scroll
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

// ===== FAQ buttery animation
function toggleFAQ(item) {
  const content = item.querySelector('.faq-a');
  const isOpen = item.classList.contains('open');

  if (isOpen) {
    const start = content.scrollHeight;
    content.style.height = start + 'px';
    requestAnimationFrame(() => { content.style.height = '0px'; });
    content.addEventListener('transitionend', function onEnd() {
      item.classList.remove('open'); content.removeEventListener('transitionend', onEnd);
    });
  } else {
    document.querySelectorAll('.faq-item.open').forEach(o => {
      const c = o.querySelector('.faq-a');
      c.style.height = c.scrollHeight + 'px';
      requestAnimationFrame(() => { c.style.height = '0px'; });
      o.classList.remove('open');
    });
    item.classList.add('open');
    const end = content.scrollHeight;
    content.style.height = end + 'px';
    content.addEventListener('transitionend', function onEnd() {
      content.style.height = 'auto'; content.removeEventListener('transitionend', onEnd);
    });
  }
}
document.querySelectorAll('[data-accordion]').forEach(btn => {
  btn.addEventListener('click', () => toggleFAQ(btn.closest('.faq-item')));
});

// ===== magnetic CTA
(function setupMagnet(){
  const wrap = document.querySelector('.magnet-wrap');
  const btn = document.querySelector('.magnet');
  if (!wrap || !btn) return;

  let tx = 0, ty = 0, dx = 0, dy = 0, raf;
  const strength = 0.25;   // how far to move relative to mouse
  const radius = 140;       // active area in px

  function animate(){
    tx += (dx - tx) * 0.18;
    ty += (dy - ty) * 0.18;
    btn.style.transform = `translate(${tx}px, ${ty}px)`;
    raf = requestAnimationFrame(animate);
  }

  function onMove(e){
    const rect = wrap.getBoundingClientRect();
    const mx = e.clientX - (rect.left + rect.width/2);
    const my = e.clientY - (rect.top + rect.height/2);
    const dist = Math.hypot(mx, my);

    if (dist < radius && !prefersReduced) {
      dx = mx * strength;
      dy = my * strength;
      if (!raf) raf = requestAnimationFrame(animate);
    } else {
      dx = dy = 0;
    }
  }
  function onLeave(){
    dx = dy = 0;
    cancelAnimationFrame(raf); raf = null;
    btn.style.transform = 'translate(0,0)';
  }

  wrap.addEventListener('pointermove', onMove);
  wrap.addEventListener('pointerleave', onLeave);
})();

// ===== subtle parallax for tiles (and can be reused for other elems)
const pxEls = [...document.querySelectorAll('.px')];
function parallaxTick(){
  const vh = window.innerHeight;
  pxEls.forEach(el=>{
    const speed = parseFloat(el.dataset.speed || '0.1');
    const rect = el.getBoundingClientRect();
    const mid = rect.top + rect.height/2;
    const offsetFromCenter = mid - vh/2; // positive when below center
    const translate = offsetFromCenter * speed * 0.15; // small multiplier for subtlety
    el.style.transform = `translateY(${translate}px)`;
  });
}

// ===== a11y focus on anchor jump
document.querySelectorAll('.nav-links a').forEach(a=>{
  a.addEventListener('click', ()=>{
    const id = a.getAttribute('href') || '';
    if (id.startsWith('#')) {
      const el = document.querySelector(id);
      if (el) { el.setAttribute('tabindex','-1'); el.focus({ preventScroll:true }); }
    }
  });
});

// ===== waitlist (plug your form URL when ready)
// document.getElementById('waitlist')?.addEventListener('click', (e)=>{
//   e.preventDefault(); location.href = 'https://forms.gle/your-waitlist';
// });
