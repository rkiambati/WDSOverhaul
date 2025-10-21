/**
WDS Externals Hackathon – annotated pass
Author notes (Reich): 
If something breaks, check the console first, then network panel for /api calls.
Front-of-site interactions: parallax, magnetic CTAs, FAQ accordion, scroll progress.
Last touched: 2025-10-20 19:00
*/

document.documentElement.classList.add('js');

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* Scroll progress bar */
const progressBar = $('.progress-bar');
function onScroll() {
  const h = document.documentElement;
  const max = h.scrollHeight - h.clientHeight;
  const pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
  if (progressBar) progressBar.style.width = pct + '%';
}
window.addEventListener('scroll', onScroll);
onScroll();

/* Night stars: single brand color, gentle twinkle */
function spawnStars(){
  const host = $('.stars');
  if (!host) return;
  const n = 18; // tasteful count
  const frag = document.createDocumentFragment();
  for (let i=0;i<n;i++){
    const s = document.createElement('span');
    s.style.left = Math.random()*100 + '%';
    s.style.top = Math.random()*60 + '%';
    s.style.width = s.style.height = (4 + Math.random()*4) + 'px';
    s.style.animationDelay = (Math.random()*2.2).toFixed(2) + 's';
    s.style.opacity = (0.45 + Math.random()*0.45).toFixed(2);
    frag.appendChild(s);
  }
  host.appendChild(frag);
}
spawnStars();

/* Parallax for hero and tiles + badges */
function parallaxTiles() {
  const tiles = $$('.px');
  const y = window.scrollY || 0;
  tiles.forEach((t, i) => {
    const nudge = Math.sin((y + i * 60) / 420) * 3.5; // slightly reduced for subtlety
    t.style.transform = `translateY(${nudge}px)`;
  });

  const moon = $('.moon');
  const hills = $('.hills');
  if (moon) moon.style.transform = `translateY(${y * 0.05}px)`;
  if (hills) hills.style.transform = `translateY(${y * 0.02}px)`;
}
window.addEventListener('scroll', parallaxTiles);
parallaxTiles();

/* ===== Magnetic buttons ===== */
// Magnetic CTA hover effect; keep radius/strength tuned for laptop trackpads.
function setupMagnet(el, strength = 18, radius = 120){
  const wrap = el.closest('.magnet-wrap') || el.parentElement;
  if (!wrap) return;

  wrap.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist < radius){
      const p = 1 - dist / radius;
      el.style.transform = `translate(${dx * p * (strength/100)}px, ${dy * p * (strength/100)}px)`;
    } else {
      el.style.transform = '';
    }
  });

  wrap.addEventListener('mouseleave', () => {
    el.style.transform = '';
  });
}
$$('.magnet').forEach(btn => setupMagnet(btn));

/* ===== FAQ buttery animation ===== */
// a11y: we keep buttons elements, not divs, and only animate height, not display
function setupFAQ(){
  const qs = $$('[data-accordion]');
  qs.forEach(q => {
    const a = q.nextElementSibling;
    if (!a) return;

    // ensure hidden initially
    a.hidden = true;
    a.style.height = '0px';

    q.addEventListener('click', () => {
      const open = q.getAttribute('aria-expanded') === 'true';
      q.setAttribute('aria-expanded', String(!open));

      if (open){
        a.style.height = a.scrollHeight + 'px'; // set current, then collapse
        requestAnimationFrame(() => {
          a.style.height = '0px';
        });
        setTimeout(() => { a.hidden = true; }, 220);
      } else {
        a.hidden = false;
        a.style.height = 'auto';
        const target = a.scrollHeight;
        a.style.height = '0px';
        requestAnimationFrame(() => {
          a.style.height = target + 'px';
        });
        setTimeout(() => { a.style.height = 'auto'; }, 240);
      }
    });
  });
}
setupFAQ();

/* Hydrate from content.json */
async function loadContent(){
  try{
    const res = await fetch('content.json', { cache: 'no-store' });
    const data = await res.json();

    // testimonials
    const tl = $('#testimonials-list');
    if (tl && Array.isArray(data.testimonials)){
      tl.innerHTML = data.testimonials.map(t => `
        <div class="card reveal">
          <p>${t.quote}</p>
          <p class="note">— ${t.author}</p>
        </div>
      `).join('');
      revealOnScroll();
    }

    // sponsors logos
    const sl = $('#sponsor-logos');
    if (sl && Array.isArray(data.sponsors)){
      sl.innerHTML = data.sponsors.map(s => `<img src="${s.logo}" alt="${s.name} logo" loading="lazy">`).join('');
    }
  }catch(e){
    console.error('content load failed', e);
  }
}
loadContent();

/* Reveal on scroll */
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
window.addEventListener('scroll', revealOnScroll);
revealOnScroll();
