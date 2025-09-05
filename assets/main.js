// Wrap so a stray error never blanks the page.
(function(){
  // Mark that JS is running (lets CSS opt-in to animated reveals)
  document.documentElement.classList.add('js');

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ===== Header scroll + progress
  const header = document.getElementById('header');
  const progressBar = document.querySelector('.progress span');

  function onScroll() {
    const y = window.scrollY || 0;
    if (header) header.classList.toggle('scrolled', y > 6);

    const h = document.documentElement.scrollHeight - window.innerHeight;
    if (progressBar) progressBar.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';

    if (!prefersReduced) {
      parallaxTiles();
      parallaxHero();
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ===== Reveal on scroll (with fallback)
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => obs.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  // ===== FAQ buttery animation
  function toggleFAQ(item) {
    const content = item.querySelector('.faq-a');
    if (!content) return;

    const isOpen = item.classList.contains('open');
    if (isOpen) {
      const start = content.scrollHeight;
      content.style.height = start + 'px';
      requestAnimationFrame(() => { content.style.height = '0px'; });
      content.addEventListener('transitionend', function handler(ev){
        if (ev.propertyName !== 'height') return;
        item.classList.remove('open');
        content.removeEventListener('transitionend', handler);
      });
    } else {
      // close others
      document.querySelectorAll('.faq-item.open').forEach(o => {
        const c = o.querySelector('.faq-a');
        if (!c) return;
        c.style.height = c.scrollHeight + 'px';
        requestAnimationFrame(() => { c.style.height = '0px'; });
        o.classList.remove('open');
      });
      // open this
      item.classList.add('open');
      const end = content.scrollHeight;
      content.style.height = end + 'px';
      content.addEventListener('transitionend', function handler(ev){
        if (ev.propertyName !== 'height') return;
        content.style.height = 'auto';
        content.removeEventListener('transitionend', handler);
      });
    }
  }
  document.querySelectorAll('[data-accordion]').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      if (item) toggleFAQ(item);
    });
  });

  // ===== Magnetic CTAs (hero + sponsors)
  setupMagnet('.magnet-wrap', '.magnet');
  setupMagnet('#sponsors .center', '.magnet-2');

  function setupMagnet(selectorWrap, selectorBtn){
    const wrap = document.querySelector(selectorWrap);
    const btn = document.querySelector(selectorBtn);
    if (!wrap || !btn) return;

    let tx=0, ty=0, dx=0, dy=0, raf=null;
    const strength = 0.25;
    const radius = 140;

    function animate(){
      tx += (dx - tx) * 0.18;
      ty += (dy - ty) * 0.18;
      btn.style.transform = `translate(${tx}px, ${ty}px)`;
      raf = requestAnimationFrame(animate);
    }
    function onMove(e){
      const r = wrap.getBoundingClientRect();
      const mx = e.clientX - (r.left + r.width/2);
      const my = e.clientY - (r.top + r.height/2);
      const dist = Math.hypot(mx, my);
      if (dist < radius && !prefersReduced) {
        dx = mx * strength; dy = my * strength;
        if (!raf) raf = requestAnimationFrame(animate);
      } else {
        dx = dy = 0;
      }
    }
    function onLeave(){
      dx = dy = 0;
      if (raf) cancelAnimationFrame(raf); raf = null;
      btn.style.transform = 'translate(0,0)';
    }
    wrap.addEventListener('pointermove', onMove);
    wrap.addEventListener('pointerleave', onLeave);
  }

  // ===== Parallax for tiles (subtle)
  const pxEls = Array.from(document.querySelectorAll('.px'));
  function parallaxTiles(){
    const vh = window.innerHeight || 1;
    pxEls.forEach(el=>{
      const speed = parseFloat(el.dataset.speed || '0.1');
      const rect = el.getBoundingClientRect();
      const mid = rect.top + rect.height/2;
      const offsetFromCenter = mid - vh/2;
      const translate = offsetFromCenter * speed * 0.15;
      el.style.transform = `translateY(${translate}px)`;
    });
  }
  parallaxTiles();

  // ===== Parallax for hero layers (super subtle)
  const sun = document.querySelector('.sun');
  const hill1 = document.querySelector('.hill-1');
  const hill2 = document.querySelector('.hill-2');
  function parallaxHero(){
    const y = window.scrollY || 0;
    if (sun)   sun.style.transform  = `translateY(${y * -0.08}px)`;
    if (hill1) hill1.style.transform = `translateY(${y * 0.06}px)`;
    if (hill2) hill2.style.transform = `translateY(${y * 0.12}px)`;
  }
  parallaxHero();

  // ===== A11y focus on anchor jump
  document.querySelectorAll('.nav-links a').forEach(a=>{
    a.addEventListener('click', ()=>{
      const id = a.getAttribute('href') || '';
      if (id.startsWith('#')) {
        const el = document.querySelector(id);
        if (el) { el.setAttribute('tabindex','-1'); el.focus({ preventScroll:true }); }
      }
    });
  });

  // ===== Wire your waitlist when ready
  // document.getElementById('waitlist')?.addEventListener('click', (e)=>{
  //   e.preventDefault(); location.href = 'https://forms.gle/your-waitlist';
  // });
})();
