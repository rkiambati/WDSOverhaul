/**
WDS Externals Hackathon – night theme interactions
Author notes (Reich):
If something breaks, check console first, then Network for /api calls.
Last touched: 2025-10-20
*/
document.documentElement.classList.add('js');
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));

/* Progress bar */
const progressBar=$('.progress-bar');
function updateProgress(){
  if(!progressBar) return;
  const h=document.documentElement, max=h.scrollHeight-h.clientHeight;
  const pct=max>0?(h.scrollTop/max)*100:0;
  progressBar.style.transform=`scaleX(${pct/100})`;
}
window.addEventListener('scroll',updateProgress,{passive:true}); updateProgress();

/* Stars */
function spawnStars(){
  const host=$('.stars'); if(!host) return;
  const COUNT=26, frag=document.createDocumentFragment();
  for(let i=0;i<COUNT;i++){
    const s=document.createElement('span');
    s.style.left=Math.random()*100+'%';
    s.style.top=(Math.random()*55)+'%';
    const size=3+Math.random()*4;
    s.style.width=s.style.height=size+'px';
    s.style.animationDelay=(Math.random()*2.2).toFixed(2)+'s';
    s.style.opacity=(0.5+Math.random()*0.4).toFixed(2);
    frag.appendChild(s);
  }
  host.innerHTML=''; host.appendChild(frag);
}
spawnStars();

/* Parallax */
function parallax(){
  const y=window.scrollY||0;
  const moon=$('.moon'), hills=$('.hills');
  if(moon)  moon.style.transform=`translateY(${y*0.05}px)`;
  if(hills) hills.style.transform=`translateY(${y*0.02}px)`;
  $$('.px').forEach((el,i)=>{
    const nudge=Math.sin((y+i*60)/420)*3.5;
    el.style.transform=`translateY(${nudge}px)`;
  });
}
window.addEventListener('scroll',parallax,{passive:true}); parallax();

/* Magnetic buttons (cursor follow) */
function setupMagnet(el,strength=18,radius=120){
  const wrap=el.closest('.magnet-wrap')||el.parentElement; if(!wrap) return;
  wrap.addEventListener('mousemove',e=>{
    const r=el.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
    const dx=e.clientX-cx, dy=e.clientY-cy, d=Math.hypot(dx,dy);
    if(d<radius){
      const p=1-d/radius;
      el.style.transform=`translate(${dx*p*(strength/100)}px, ${dy*p*(strength/100)}px)`;
    } else el.style.transform='';
  });
  wrap.addEventListener('mouseleave',()=> el.style.transform='');
}
$$('.magnet').forEach(setupMagnet);

/* FAQ */
(function setupFAQ(){
  $$('[data-accordion]').forEach(btn=>{
    const panel=btn.nextElementSibling; if(!panel) return;
    panel.hidden=true; panel.style.height='0px';
    btn.addEventListener('click',()=>{
      const open=btn.getAttribute('aria-expanded')==='true';
      btn.setAttribute('aria-expanded', String(!open));
      if(open){
        panel.style.height=panel.scrollHeight+'px';
        requestAnimationFrame(()=> panel.style.height='0px');
        setTimeout(()=> panel.hidden=true, 220);
      }else{
        panel.hidden=false; panel.style.height='auto';
        const h=panel.scrollHeight; panel.style.height='0px';
        requestAnimationFrame(()=> panel.style.height=h+'px');
        setTimeout(()=> panel.style.height='auto', 240);
      }
    });
  });
})();

/* Reveal */
function reveal(){
  const els=$$('.reveal'), viewH=window.innerHeight||800, y=window.scrollY||0;
  els.forEach(el=>{
    if(el.classList.contains('visible')) return;
    const rect=el.getBoundingClientRect(), top=rect.top+y;
    if(y+viewH>top+40) el.classList.add('visible');
  });
}
window.addEventListener('scroll',reveal,{passive:true}); reveal();

/* Pond micro-effects */
(function pond(){
  const bubbles=$$('.bubble');
  bubbles.forEach(b=>{
    const amp=2+Math.random()*2.5, speed=3000+Math.random()*2500;
    let t0=performance.now();
    function tick(t){
      const dt=t-t0, y=Math.sin(dt/speed*2*Math.PI)*amp, x=Math.cos(dt/(speed*1.2)*2*Math.PI)*(amp*.4);
      b.style.transform=`translate(${x}px, ${y}px)`; requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
  const ripples=$$('.pad .ripple');
  ripples.forEach(r=>{
    const base=0.06+Math.random()*0.04; let dir=1, op=base;
    setInterval(()=>{ op+=dir*0.02; if(op>base+0.05||op<base) dir*=-1; r.style.opacity=op.toFixed(2); },180);
  });
})();

/* Content loader + placeholders to “fill” the page */
async function loadContent(){
  try{
    const res=await fetch('content.json',{cache:'no-store'});
    const data=await res.json();

    const tl=$('#testimonials-list');
    if(tl){
      const incoming=Array.isArray(data.testimonials)?data.testimonials:[];
      // Build up to 6 cards with placeholders
      const total=6;
      const placeholders=Array.from({length:Math.max(0,total-incoming.length)},(_,i)=>({
        quote: '',
        author: 'Hacker',
        avatar: '' // blank triggers skeleton
      }));
      const list=[...incoming,...placeholders].slice(0,total);

      tl.innerHTML=list.map(t=>{
        const hasAvatar=Boolean(t.avatar);
        const hasQuote=Boolean(t.quote);
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
              : `<div class="skel" style="height:14px;width:80%;"></div>
                 <div class="skel" style="height:14px;width:65%;margin-top:8px;"></div>`}
          </div>
        `;
      }).join('');

      reveal();
    }

    // Sponsors logos (unchanged)
    const sl=$('#sponsor-logos');
    if(sl && Array.isArray(data.sponsors)){
      sl.innerHTML=data.sponsors.map(s=>`<img src="${s.logo}" alt="${s.name} logo" loading="lazy">`).join('');
    }
  }catch(e){
    console.error('content load failed',e);
    // fallback: make 6 skeleton testimonial cards so the section still looks full
    const tl=$('#testimonials-list');
    if(tl){
      tl.innerHTML = Array.from({length:6}).map(()=>`
        <div class="card testimonial reveal">
          <div class="t-head">
            <div class="avatar skel" aria-hidden="true"></div>
            <div class="meta" style="flex:1">
              <div class="skel" style="height:14px;width:40%;"></div>
              <div class="skel" style="height:12px;width:30%;margin-top:8px;"></div>
            </div>
          </div>
          <div class="skel" style="height:14px;width:85%;"></div>
          <div class="skel" style="height:14px;width:70%;margin-top:8px;"></div>
        </div>
      `).join('');
      reveal();
    }
  }
}
loadContent();

/* Resize safety */
window.addEventListener('resize',()=>{updateProgress();parallax();},{passive:true});
