/**
WDS Externals Hackathon – night theme interactions
Author notes (Reich):
If something breaks, check console first, then Network for /api calls.
Last touched: 2025-10-20
*/

document.documentElement.classList.add('js');

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ===============================
   Scroll progress bar (header)
   =============================== */
const progressBar = $('.progress-bar');
function updateProgress() {
  if (!progressBar) return;
  const h = document.documentElement;
  const max = h.scrollHeight - h.clientHeight;
  const pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
  progressBar.style.width = pct + '%';
}
window.addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

/* ===============================
   Night sky: stars + moon parallax
   =============================== */
function spawnStars() {
  const host = $('.stars');
  if (!host) return;

  // keep it tasteful
  const COUNT = 22;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < COUNT; i++) {
    const s = document.createElement('span');
    s.style.left = Math.random() * 100 + '%';
    s.style.top = (Math.random() * 55) + '%'; // upper half of hero
    const size = 3 + Math.random() * 4;
    s.style.width = s.style.height = size + 'px';
    s.style.animationDelay = (Math.random() * 2.2).toFixed(2) + 's';
    s.style.opacity = (0.45 + Math.random() * 0.45).toFixed(2);
    frag.appendChild(s);
  }
  host.innerHTML = '';
  host.appendChild(frag);
}
spawnStars();

/* Slight parallax for hero layers and any .px tiles/badges */
function parallaxOnScroll() {
  const y = window.scrollY || 0;

  // hero bits
  const moon  = $('.moon');
  const hills = $('.hills');
  if (moon)  moon.style.transform  = `translateY(${y * 0.05}px)`;
  if (hills) hills.style.transform = `translateY(${y * 0.02}px)`;

  // tiles and badges reuse the same nudge
  $$('.px').forEach((el, i) => {
    const nudge = Math.sin((y + i * 60) / 420) * 3.5;
    el.style.transform = `translateY(${nudge}px)`;
  });
}
window.addEventListener('scroll', parallaxOnScroll, { passive: true });
parallaxOnScroll();

/* ===============================
   Magnetic CTAs (primary only)
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
   FAQ buttery accordion (a11y)
   =============================== */
function setupFAQ() {
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
        // collapse
        panel.style.height = panel.scrollHeight + 'px';
        requestAnimationFrame(() => { panel.style.height = '0px'; });
        setTimeout(() => { panel.hidden = true; }, 220);
      } else {
        // expand
        panel.hidden = false;
        panel.style.height = 'auto';
        const target = panel.scrollHeight;
        panel.style.height = '0px';
        requestAnimationFrame(() => { panel.style.height = target + 'px'; });
        setTimeout(() => { panel.style.height = 'auto'; }, 240);
      }
    });
  });
}
setupFAQ();

/* ===============================
   Reveal on scroll (progressive)
   =============================== */
function revealOnScroll() {
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
   Pond effects hooks (testimonials)
   Lilypads: .pad
   Bubbles: .bubble  (JS gives random delays & drift)
   =============================== */
function initPond() {
  // soft float on bubbles using JS-driven transform to avoid extra CSS
  const bubbles = $$('.bubble');
  if (bubbles.length) {
    bubbles.forEach((b, i) => {
      const baseX = parseFloat(b.dataset.x || 0);
      const baseY = parseFloat(b.dataset.y || 0);
      const amp   = 2 + Math.random() * 2.5;
      const speed = 3000 + Math.random() * 2500;
      let t0 = performance.now();
      function tick(t) {
        const dt = t - t0;
        const y = Math.sin(dt / speed * 2 * Math.PI) * amp;
        const x = Math.cos(dt / (speed * 1.2) * 2 * Math.PI) * (amp * 0.4);
        b.style.transform = `translate(${baseX + x}px, ${baseY + y}px)`;
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  // ripple pulse for pads via opacity toggle on child .ripple if present
  const pads = $$('.pad .ripple');
  pads.forEach((r, i) => {
    const base = 0.06 + Math.random() * 0.04;
    let dir = 1, op = base;
    setInterval(() => {
      op += dir * 0.02;
      if (op > base + 0.05 || op < base) dir *= -1;
      r.style.opacity = op.toFixed(2);
    }, 180);
  });
}
initPond();

/* ===============================
   Content loader (content.json)
   testimonials + sponsor logos
   =============================== */
async function loadContent() {
  try {
    const res = await fetch('content.json', { cache: 'no-store' });
    const data = await res.json();

    // Testimonials
    const tl = $('#testimonials-list');
    if (tl && Array.isArray(data.testimonials)) {
      tl.innerHTML = data.testimonials.map(t => `
        <div class="card reveal">
          <p>${t.quote}</p>
          <p class="note">— ${t.author}</p>
        </div>
      `).join('');
      revealOnScroll();
    }

    // Sponsors logos
    const sl = $('#sponsor-logos');
    if (sl && Array.isArray(data.sponsors)) {
      sl.innerHTML = data.sponsors
        .map(s => `<img src="${s.logo}" alt="${s.name} logo" loading="lazy">`)
        .join('');
    }
  } catch (err) {
    console.error('content load failed', err);
  }
}
loadContent();

/* ===============================
   Resize handlers
   =============================== */
window.addEventListener('resize', () => {
  updateProgress();
  parallaxOnScroll();
}, { passive: true });
