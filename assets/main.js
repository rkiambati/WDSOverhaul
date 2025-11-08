/**
 WDS Externals Hackathon — interactions
 Progress bar, stars/flowers, FAQ, pond bubbles, magnetic buttons, content hydrate.
*/
/**
 * WDS Externals — small interactions
 * - Sticky header glass
 * - Slow smooth-scrolling for navbar links (with header offset)
 * - Stars/flowers layers
 * - Testimonials (now 2)
 * - Optional sponsor rail hidden
 * - FAQ accordion (smoother open/close)
 * - Pond bubbles (kept light)
 */
const $  = (s, c=document) => c.querySelector(s);
const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));

/* ===== header glass after scroll ===== */
(() => {
  const header = $('.site-header');
  if (!header) return;
  const onScroll = () => {
    if (window.scrollY > 8) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  };
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });
})();

/* ===== slim top progress bar ===== */
(() => {
  const el = $('#progress-bar');
  if (!el) return;
  const update = () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    el.style.width = (max ? (h.scrollTop / max) : 0) * 100 + '%';
  };
  update();
  addEventListener('scroll', update, { passive: true });
})();

/* ===== slow, offset smooth-scroll for navbar + any in-page anchor ===== */
(() => {
  const header = $('.site-header');
  const headerH = () => (header ? header.offsetHeight : 0);

  function easeInOut(t){ return t<.5 ? 2*t*t : -1+(4-2*t)*t; }

  function smoothScrollTo(targetY, duration=900){
    const startY = window.scrollY;
    const dist = targetY - startY;
    let t0 = null;
    function step(ts){
      if(!t0) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      const eased = easeInOut(p);
      window.scrollTo(0, startY + dist * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function handleClick(e){
    const a = e.currentTarget;
    const href = a.getAttribute('href') || '';
    if (!href.startsWith('#') || href === '#') return;
    const target = $(href);
    if (!target) return;
    e.preventDefault();
    // account for sticky header
    const y = Math.max(0, target.getBoundingClientRect().top + window.scrollY - headerH() - 8);
    smoothScrollTo(y, 950);
  }

  $$('a[href^="#"]').forEach(a => a.addEventListener('click', handleClick));
})();

/* ===== stars / flowers painters ===== */
function spawnDots(container, count = 24, color='rgba(255,255,255,0.95)', asFlowers=false){
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < count; i++){
    const s = document.createElement('i');
    const size = Math.random() * 2 + 2;
    s.style.position = 'absolute';
    s.style.left = (Math.random()*100) + '%';
    s.style.top  = (Math.random()*100) + '%';
    s.style.pointerEvents = 'none';

    if (asFlowers){
      s.style.width = s.style.height = (size + 3) + 'px';
      s.style.transform = 'rotate(45deg)';
      s.style.background = color;
      const petal = document.createElement('i');
      petal.style.cssText = `position:absolute;inset:0;background:${color};transform:rotate(90deg)`;
      s.appendChild(petal);
      s.style.opacity = .9;
    } else {
      s.style.width = size + 'px';
      s.style.height = size + 'px';
      s.style.background = color;
      s.style.borderRadius = '2px';
      s.style.boxShadow = `0 0 ${Math.random()*6+4}px ${color}`;
      s.style.transform = 'rotate(45deg)';
      s.style.opacity = 0.9;
    }
    container.appendChild(s);
  }
}

// keep hero subtle stars, sponsors & FAQ stars
spawnDots($('#hero-sparkles'), 70, 'rgba(255,255,255,0.95)', false);
spawnDots($('#sponsor-stars'), 30, 'rgba(255,255,255,0.9)', false);
spawnDots($('#faq-stars'), 28, 'rgba(255,255,255,0.92)', false);

/* ===== magnetic buttons ===== */
$$('.magnet').forEach(btn => {
  btn.addEventListener('mousemove', (e) => {
    const r = btn.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top  - r.height / 2;
    btn.style.transform = `translate(${x*0.05}px, ${y*0.12}px)`;
  });
  btn.addEventListener('mouseleave', () => btn.style.transform = 'translate(0,0)');
});

/* ===== FAQ accordion (smoother) ===== */
$$('.faq-a').forEach(a => { a.hidden = false; a.style.maxHeight = '0px'; a.classList.remove('open'); });

$$('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const a = btn.nextElementSibling;
    if (!a) return;
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));

    if (expanded){
      // close
      a.style.maxHeight = a.scrollHeight + 'px';
      requestAnimationFrame(() => {
        a.style.maxHeight = '0px';
        a.classList.remove('open');
      });
    } else {
      // open
      a.classList.add('open');
      requestAnimationFrame(() => {
        a.style.maxHeight = a.scrollHeight + 'px';
      });
    }
  });
});

/* ===== Pond bubbles (kept minimal) ===== */
(() => {
  const wrap = $('#bubbles');
  if (!wrap) return;
  const W = wrap.clientWidth || window.innerWidth;
  const H = wrap.clientHeight || 420;
  const total = 14; // lighter
  for (let i=0;i<total;i++){
    const b = document.createElement('div');
    b.className = 'bubble';
    const x = Math.random() * W;
    const y = Math.random() * H;
    b.style.left = x + 'px';
    b.style.top  = y + 'px';
    wrap.appendChild(b);
    let dir = Math.random() > .5 ? 1 : -1;
    let t = y, x0 = x;
    setInterval(() => {
      t -= .55; if (t < -20) t = H + 20;
      x0 += dir * .22;
      b.style.top  = t + 'px';
      b.style.left = x0 + 'px';
    }, 60);
  }
})();

/* ===== Content hydrate: 2 testimonials, sponsor rail removed ===== */
async function loadContent(){
  let data;
  try {
    const res = await fetch('content.json', { cache:'no-store' });
    data = await res.json();
  } catch {
    data = {
      testimonials: [
        {author:'Jordan L.', quote:'Built more in 48 hours than all semester.'},
        {author:'Maya P.',   quote:'Tight prompts, zero fluff. Great mentors.'},
        {author:'Arjun S.',  quote:'(extra) — not shown'},
        {author:'Priya D.',  quote:'(extra) — not shown'}
      ],
      sponsors: []
    };
  }

  // testimonials: render exactly 2
  const grid = $('#testimonial-grid');
  if (grid){
    grid.innerHTML = '';
    (data.testimonials || []).slice(0,2).forEach(t => {
      const card = document.createElement('article');
      card.className = 't-card';
      card.innerHTML = `
        <div class="t-head">
          <div class="avatar"></div>
          <div class="t-name">${t.author ?? 'Hacker'}</div>
        </div>
        <div class="t-quote">“${t.quote ?? 'Great vibes, fast builds.'}”</div>
      `;
      grid.appendChild(card);
    });
  }

  // hide / remove sponsor logo rail for now
  const rail = $('#logo-rail');
  if (rail){
    rail.innerHTML = '';
    rail.closest('.logos')?.classList.add('hidden');
  }
}
loadContent();
