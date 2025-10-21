/**
WDS Externals Hackathon — Night theme interactions
Progress bar, stars, parallax, FAQ, reveal, pond micro-effects,
magnetic buttons, and content hydration with smart fallbacks.
Last touched: 2025-10-20
*/

document.documentElement.classList.add('js');

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ===============================
   Scroll progress bar (full width)
   =============================== */
const progressBar = $('.progress-bar');
function updateProgress() {
  if (!progressBar) return;
  const h = document.documentElement;
  const max = h.scrollHeight - h.clientHeight;
  const pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
  // width controlled via scaleX to keep the gradient intact
  progressBar.style.transform = `scaleX(${pct / 100})`;
}
window.addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

/* ===============================
   Night sky: starfield (hero)
   =============================== */
function spawnStars() {
  const host = $('.stars');
  if (!host) return;

  const COUNT = 34; // a few more stars per your request
  const frag = document.createDocumentFragment();
  for (let i = 0; i < COUNT; i++) {
    const s = document.createElement('span');
    s.style.left = Math.random() * 100 + '%';
    s.style.top  = Math.random() * 55 + '%'; // upper portion of hero
    const size = 3 + Math.random() * 4;
    s.style.width = s.style.height = size + 'px';
    s.style.animationDelay = (Math.random() * 2.2).toFixed(2) + 's';
    s.style.opacity = (0.5 + Math.random() * 0.4).toFixed(2);
    frag.appendChild(s);
  }
  host.innerHTML = '';
  host.appendChild(frag);
}
spawnStars();

/* ===============================
   About section: subtle white stars
   =============================== */
(function spawnAboutStars() {
  const host = $('.about-stars');
  if (!host) return;

  const COUNT = 22;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < COUNT; i++) {
    const s = document.createElement('span');
    s.style.left = Math.random() * 100 + '%';
    s.style.top  = Math.random() * 100 + '%';
    const size = 2 + Math.random() * 2;
    s.style.width = s.style.height = size + 'px';
    s.style.animationDelay = (Math.random() * 2.8).toFixed(2) + 's';
    s.style.opacity = (0.35 + Math.random() * 0.35).toFixed(2);
    frag.appendChild(s);
  }
  host.innerHTML = '';
  host.appendChild(frag);
})();

/* ===============================
   Parallax for hero bits + tiles/badges
   =============================== */
function parallaxOnScroll() {
  const y = window.scrollY || 0;
  const moon  = $('.moon');
  const hills = $('.hills'); // safe even if height is 0
  if (moon)  moon.style.transform  = `translateY(${y * 0.05}px)`;
  if (hills) hills.style.transform = `translateY(${y * 0.02}px)`;

  $$('.px').forEach((el, i) => {
    const nudge = Math.sin((y + i * 60) / 420) * 3.5;
    el.style.transform = `translateY(${nudge}px)`;
  });
}
window.addEventListener('scroll', parallaxOnScroll, { passive: true });
parallaxOnScroll();

/* ===============================
   Magnetic buttons (cursor follow)
   =============================== */
function setupMagnet(el, strength = 18, radius = 120) {
  const wrap = el.closest('.magnet-wrap') || el.parentElement;
  if (!wrap) return;

  wrap.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);

    if (dist < radius) {
      const p = 1 - dist / radius;
      el.style.transform = `translate(${dx * p * (strength / 100)}px, ${dy * p * (strength / 100)}px)`;
    } else {
      el.style.transform = '';
    }
  });

  wrap.addEventListener('mouseleave', () => {
    el.style.transform = '';
  });
}
$$('.magnet').forEach(btn => setupMagnet(btn));

/* ===============================
   FAQ accordion (accessible)
   =============================== */
(function setupFAQ(){
  const triggers = $$('[data-accordion]');
  triggers.forEach(btn => {
    const panel = btn.nextElementSibling;
    if (!panel) return;

    panel.hidden = true;
    panel.style.height = '0px';

    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));

      if (open) {
        panel.style.height = panel.scrollHeight + 'px';
        requestAnimationFrame(() => { panel.style.height = '0px'; });
        setTimeout(() => { panel.hidden = true; }, 220);
      } else {
        panel.hidden = false;
        panel.style.height = 'auto';
        const target = panel.scrollHeight;
        panel.style.height = '0px';
        requestAnimationFrame(() => { panel.style.height = target + 'px'; });
        setTimeout(() => { panel.style.height = 'auto'; }, 240);
      }
    });
  });
})();

/* ===============================
   Reveal on scroll (progressive)
   =============================== */
function revealOnScroll(){
  const els = $$('.reveal');
  const viewH = window.innerHeight || 800;
  const y = window.scrollY || 0;

  els.forEach(el => {
    if (el.classList.contains('visible')) return;
    const rect = el.getBoundingClientRect();
    const top = rect.top + y;
    if (y + viewH > top + 40) el.classList.add('visible');
  });
}
window.addEventListener('scroll', revealOnScroll, { passive: true });
revealOnScroll();

/* ===============================
   Pond micro-effects (bubbles float, ripples pulse)
   =============================== */
(function initPond() {
  const bubbles = $$('.bubble');
  bubbles.forEach(b => {
    const amp = 2 + Math.random() * 2.5;
    const speed = 3000 + Math.random() * 2500;
    let t0 = performance.now();
    function tick(t) {
      const dt = t - t0;
      const y = Math.sin(dt / speed * 2 * Math.PI) * amp;
      const x = Math.cos(dt / (speed * 1.2) * 2 * Math.PI) * (amp * 0.4);
      b.style.transform = `translate(${x}px, ${y}px)`;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });

  const ripples = $$('.pad .ripple');
  ripples.forEach(r => {
    const base = 0.06 + Math.random() * 0.04;
    let dir = 1, op = base;
    setInterval(() => {
      op += dir * 0.02;
      if (op > base + 0.05 || op < base) dir *= -1;
      r.style.opacity = op.toFixed(2);
    }, 180);
  });
})();

/* ===============================
   Content loader (testimonials + sponsors)
   - Testimonials: show up to 3; auto-fill with short, friendly filler quotes.
   =============================== */
async function loadContent(){
  try{
    const res = await fetch('content.json', { cache: 'no-store' });
    const data = await res.json();

    // Testimonials (3 cards + filler if needed)
    const tl = $('#testimonials-list');
    if (tl) {
      const incoming = Array.isArray(data.testimonials) ? data.testimonials : [];
      const TARGET = 3;
      const fillers = [
        { author: 'Past Hacker', quote: 'Super welcoming. I built more in 48 hours than all semester.', avatar: '' },
        { author: 'UI Designer', quote: 'Tight prompts, zero fluff. Great mentors.', avatar: '' },
        { author: 'Team Lead',   quote: 'Fast feedback loops and a real portfolio piece.', avatar: '' },
      ];
      const list = [...incoming, ...fillers].slice(0, TARGET);

      tl.innerHTML = list.map(t => {
        const hasAvatar = Boolean(t.avatar);
        const hasQuote  = Boolean(t.quote);
        return `
          <div class="card testimonial reveal">
            <div class="t-head">
              ${hasAvatar
                ? `<img class="avatar" src="${t.avatar}" alt="${t.author || 'Hacker'} avatar" loading="lazy">`
                : `<div class="avatar skel" aria-hidden="true"></div>`}
              <div class="meta">
                <div class="name">${t.author || 'Hacker Name'}</div>
                <div class="role">Participant</div>
              </div>
            </div>
            ${hasQuote
              ? `<p class="quote">“${t.quote}”</p>`
              : `<div class="skel" style="height:14px;width:85%;"></div>
                 <div class="skel" style="height:14px;width:65%;margin-top:8px;"></div>`}
          </div>
        `;
      }).join('');
      revealOnScroll();
    }

    // Sponsors logos
    const sl = $('#sponsor-logos');
    if (sl && Array.isArray(data.sponsors)) {
      sl.innerHTML = data.sponsors
        .map(s => `<img src="${s.logo}" alt="${s.name} logo" loading="lazy">`)
        .join('');
    }
  }catch(err){
    console.error('content load failed', err);

    // Fallback: 3 skeleton testimonial cards so section still looks full
    const tl = $('#testimonials-list');
    if (tl) {
      tl.innerHTML = Array.from({ length: 3 }).map(() => `
        <div class="card testimonial reveal">
          <div class="t-head">
            <div class="avatar skel" aria-hidden="true"></div>
            <div class="meta" style="flex:1">
              <div class="skel" style="height:14px;width:40%;"></div>
              <div class="skel" style="height:12px;width:30%;margin-top:8px;"></div>
            </div>
          </div>
          <div class="skel" style="height:14px;width:85%;"></div>
          <div class="skel" style="height:14px;width:65%;margin-top:8px;"></div>
        </div>
      `).join('');
      revealOnScroll();
    }
  }
}
loadContent();

/* ===============================
   Resize safety
   =============================== */
window.addEventListener('resize', () => {
  updateProgress();
  parallaxOnScroll();
}, { passive: true });
