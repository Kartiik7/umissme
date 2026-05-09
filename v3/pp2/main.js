(function() {
  'use strict';

  async function init() {
    try {
      const resp = await fetch('portfolio_data.json');
      const data = await resp.json();

      renderData(data);
      initInteractions();
    } catch (err) {
      console.error('Error loading portfolio data:', err);
    }
  }

  function renderData(data) {
    const { personal, skills, projects, profiles } = data;

    // 1. Meta & Title
    document.title = `${personal.name} — ${personal.role}`;
    const metaDesc = document.getElementById('meta-desc');
    if (metaDesc) metaDesc.content = `${personal.name} — ${personal.role}. ${personal.tagline}`;

    // 2. Personal Info
    const navLogo = document.getElementById('nav-logo');
    if (navLogo) navLogo.innerHTML = `${personal.initials}<em>.</em>`;
    document.querySelectorAll('.nav-logo-target').forEach(el => el.innerHTML = `${personal.initials}<em>.</em>`);
    document.querySelectorAll('.resume-link').forEach(el => el.href = personal.resume);
    document.querySelectorAll('.github-link').forEach(el => el.href = `https://github.com/${personal.github}`);

    const locStatus = document.getElementById('hero-loc-status');
    if (locStatus) locStatus.innerHTML = `&nbsp;·&nbsp; ${personal.city} &nbsp;·&nbsp; Available for work`;

    const nameTarget = document.getElementById('hero-name-target');
    if (nameTarget) {
      const parts = personal.name.split(' ');
      const first = parts[0];
      const last = parts.slice(1).join(' ');
      nameTarget.innerHTML = `${first}<br/><em>${last}</em><span style="color:var(--dim)">.</span>`;
    }

    const subTarget = document.getElementById('hero-sub-target');
    if (subTarget) subTarget.innerHTML = personal.tagline + '<br/><strong>' + personal.sub.split('.')[0] + '.</strong>' + personal.sub.split('.').slice(1).join('.');

    const emailTarget = document.getElementById('contact-email');
    if (emailTarget) {
      emailTarget.href = `mailto:${personal.email}`;
      emailTarget.textContent = personal.email;
    }

    const footerCopy = document.getElementById('footer-copy-target');
    if (footerCopy) footerCopy.textContent = `© ${new Date().getFullYear()} ${personal.name} · Made with obsession`;

    // 3. Hero Stats
    const statsTarget = document.getElementById('hero-stats-target');
    if (statsTarget) {
      statsTarget.innerHTML = personal.stats.map(s => `
        <div class="hero-meta-item">
          <strong>${s.count ? `<span data-count="${s.count}" data-suffix="${s.suffix || ''}">${s.count}${s.suffix || ''}</span>` : s.value}</strong>
          ${s.label}
        </div>
      `).join('');
    }

    // 4. Marquee
    const marqueeTarget = document.getElementById('marquee-target');
    if (marqueeTarget) {
      const items = [...skills.marquee, ...skills.marquee];
      marqueeTarget.innerHTML = items.map(item => `<span class="marquee-item">${item}</span><span class="marquee-sep">✦</span>`).join('');
    }

    // 5. About Bento
    const bioTarget = document.getElementById('about-bio-target');
    if (bioTarget) bioTarget.innerHTML = `
      <p class="bc-label">Story</p>
      <p class="bc-body">
        I'm <strong>${personal.name}</strong>, a ${personal.role.toLowerCase()} from <strong>${personal.city}</strong>.
        I care about <strong>clean code, fast UIs</strong>, and products that actually solve problems.
      </p>
    `;

    const expStat = personal.stats.find(s => s.label.toLowerCase().includes('years'));
    const expTarget = document.getElementById('about-exp-target');
    if (expTarget && expStat) expTarget.innerHTML = `
      <p class="bc-label">Experience</p>
      <p class="bc-big"><span data-count="${expStat.count}" data-suffix="${expStat.suffix || ''}">${expStat.count}${expStat.suffix || ''}</span></p>
      <p class="bc-sub">Years writing code. Still learning something new every day.</p>
    `;

    const statusTarget = document.getElementById('about-status-target');
    if (statusTarget) statusTarget.innerHTML = `
      <p class="bc-label">Current status</p>
      <p class="bc-status">Open to opportunities</p>
      <p class="bc-sub" style="margin-top:12px">Full-time or freelance. Remote preferred.</p>
    `;

    const projStat = personal.stats.find(s => s.label.toLowerCase().includes('projects'));
    const abProjTarget = document.getElementById('about-projects-target');
    if (abProjTarget && projStat) abProjTarget.innerHTML = `
      <p class="bc-label">Projects shipped</p>
      <p class="bc-big"><span data-count="${projStat.count}" data-suffix="${projStat.suffix || ''}">${projStat.count}${projStat.suffix || ''}</span></p>
      <p class="bc-sub">From side projects to actual products.</p>
    `;

    const philTarget = document.getElementById('about-philosophy-target');
    if (philTarget) philTarget.innerHTML = `
      <p class="bc-label">Philosophy</p>
      <p class="bc-mono">
        <span>if</span> (working === <span>true</span>) {<br/>
        &nbsp;&nbsp;<span>don't</span> touch it;<br/>
        } <span>else</span> {<br/>
        &nbsp;&nbsp;<span>figure it out</span>();<br/>
        }
      </p>
    `;

    // 6. Work (Home Page)
    const workTarget = document.getElementById('work-list-target');
    if (workTarget) {
      workTarget.innerHTML = projects.map((p, i) => `
        <div class="work-row rv rv-d${i % 4}" role="listitem">
          <span class="work-num">${p.id}</span>
          <div class="work-info">
            <span class="work-name">${p.name}</span>
            <div class="work-stack-desc">
              <span class="work-stack">${p.stack}</span>
              <p class="work-desc">${p.desc}</p>
            </div>
          </div>
          <div class="work-links">
            ${p.live && p.live !== '#' ? `<a class="work-link live" href="${p.live}" target="_blank" rel="noopener">Live ↗</a>` : ''}
            ${p.github ? `<a class="work-link" href="https://github.com/${p.github}" target="_blank" rel="noopener">GitHub</a>` : ''}
          </div>
          <span class="work-yr">${p.year}</span>
          <span class="work-arrow" aria-hidden="true">→</span>
          ${p.image ? `
          <div class="work-preview">
            <img src="${p.image}" alt="${p.name}" loading="lazy" class="enlarge-trigger"/>
          </div>` : ''}
        </div>
      `).join('');
    }

    // 6.b. Gallery (Dedicated Page)
    const galleryTarget = document.getElementById('projects-gallery-target');
    if (galleryTarget) {
      galleryTarget.innerHTML = projects.map((p, i) => `
        <div class="pg-card rv rv-d${i % 4}">
          <div class="pg-img-box enlarge-trigger-box">
            <img src="${p.image || 'https://via.placeholder.com/800x500/111/111?text=' + p.name}" alt="${p.name}" loading="lazy" class="enlarge-trigger"/>
            <div class="pg-img-overlay">
               <span>Click to enlarge</span>
            </div>
          </div>
          <div class="pg-content">
            <div class="pg-head">
              <h3 class="pg-title">${p.name}</h3>
              <span class="pg-year">${p.year}</span>
            </div>
            <p class="pg-desc">${p.desc}</p>
            <span class="pg-stack">${p.stack}</span>
            <div class="pg-links">
              ${p.live && p.live !== '#' ? `<a class="pg-btn accent" href="${p.live}" target="_blank" rel="noopener">Live Demo ↗</a>` : ''}
              ${p.github ? `<a class="pg-btn" href="https://github.com/${p.github}" target="_blank" rel="noopener">Source Code</a>` : ''}
            </div>
          </div>
        </div>
      `).join('');
    }

    // 7. Skills
    const skillsTarget = document.getElementById('skills-target');
    if (skillsTarget) {
      skillsTarget.innerHTML = skills.categories.map(cat => `
        <div class="skill-cat">
          <p class="skill-cat-h">${cat.title}</p>
          ${cat.items.map(item => `
            <div class="skill-item">
              <span class="skill-name">${item.name}</span>
              <span class="skill-line"></span>
              <span class="skill-lvl ${item.level.toLowerCase() === 'expert' ? 'pro' : ''}">${item.level}</span>
            </div>
          `).join('')}
        </div>
      `).join('');
    }

    // 8. Profiles
    const profilesTarget = document.getElementById('profiles-target');
    if (profilesTarget) {
      profilesTarget.innerHTML = profiles.map(p => `
        <a class="cp-card rv" href="${p.url}" target="_blank" rel="noopener" style="--cp-c:${p.color}">
          <div class="cp-icon" style="background:${p.color}1f;color:${p.color}">
            ${getIcon(p.icon, p.name)}
          </div>
          <div style="flex:1">
            <span class="cp-name">${p.name}</span>
            <span class="cp-user">${p.user}</span>
            <ul class="cp-bullets">
              ${p.bullets.map(b => `<li>${b}</li>`).join('')}
            </ul>
          </div>
          <span class="cp-arrow">→</span>
        </a>
      `).join('');
    }

    // 9. Social Links
    const socialTarget = document.getElementById('social-links-target');
    const footerSocialTarget = document.getElementById('footer-socials-target');
    const socials = [
      { name: 'GitHub', url: `https://github.com/${personal.github}`, icon: 'github' },
      { name: 'LinkedIn', url: `https://linkedin.com/in/${personal.linkedin}`, icon: 'linkedin' },
      { name: 'Twitter', url: personal.twitter, icon: 'twitter' },
      { name: 'Email', url: `mailto:${personal.email}`, icon: 'email' }
    ];
    if (socialTarget) {
      socialTarget.innerHTML = socials.map(s => `
        <a class="social-btn" href="${s.url}" target="_blank" rel="noopener">
          ${getIcon(s.icon)}
          ${s.name}
        </a>
      `).join('');
    }
    if (footerSocialTarget) {
      footerSocialTarget.innerHTML = socials.slice(0, 2).map(s => `
        <a class="social-btn" href="${s.url}" target="_blank" rel="noopener" style="padding:8px 14px;font-size:0.75rem">${s.name}</a>
      `).join('');
    }
  }

  function getIcon(key, name) {
    if (key === 'github') return `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>`;
    if (key === 'leetcode') return `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0z"/></svg>`;
    if (key === 'linkedin') return `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>`;
    if (key === 'twitter') return `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.258 5.63 5.907-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`;
    if (key === 'email') return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`;
    if (key === 'gfg') return `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M21.45 14.315c-.143.28-.334.532-.565.745a3.691 3.691 0 0 1-1.104.695 4.51 4.51 0 0 1-1.695.279c-.777 0-1.45-.165-2.02-.449-.009-.009-.026-.009-.034-.017a4.507 4.507 0 0 1-.9-.665 4.767 4.767 0 0 1-.601-.735c-.009.008-.009.008-.017.017a5.35 5.35 0 0 1-.62.735 4.497 4.497 0 0 1-.905.665 4.785 4.785 0 0 1-2.02.449 4.497 4.497 0 0 1-1.695-.28 3.726 3.726 0 0 1-1.104-.694 3.309 3.309 0 0 1-.565-.745A2.52 2.52 0 0 1 7.4 13.21a2.37 2.37 0 0 1 .06-.55 2.758 2.758 0 0 1 .18-.53 3.256 3.256 0 0 1 .315-.498c.127-.17.275-.33.44-.474.339-.296.71-.524 1.122-.69.411-.165.855-.25 1.33-.25.026 0 .06.008.086.008a3.73 3.73 0 0 1 1.485.305 4.21 4.21 0 0 1 1.147.769l.009.008a6.028 6.028 0 0 1 .48.533l.093.12.093-.12a5.73 5.73 0 0 1 .48-.533l.009-.008a4.21 4.21 0 0 1 1.147-.77 3.73 3.73 0 0 1 1.485-.304c.025 0 .06-.008.085-.008.476 0 .92.085 1.33.25.412.165.784.394 1.122.69.166.143.314.304.44.474.127.17.235.33.316.498.08.17.14.348.18.53.042.18.06.364.06.55a2.52 2.52 0 0 1-.212 1.105zM12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4477 10-10S17.523 2 12 2z"/></svg>`;
    if (key === 'codechef') return '👨‍🍳';
    if (key === 'codeforces') return 'CF';
    if (key === 'hackerrank') return 'HR';
    return name.charAt(0);
  }

  function initInteractions() {
    // ── Custom Cursor ──
    const ring = document.querySelector('.c-ring');
    const dot = document.querySelector('.c-dot');
    let mx = 0, my = 0, rx = 0, ry = 0;
    const LERP = 0.13;

    document.addEventListener('mousemove', e => {
      mx = e.clientX; 
      my = e.clientY;
      dot.style.left = mx + 'px';
      dot.style.top = my + 'px';
    });

    function animCursor() {
      rx += (mx - rx) * LERP;
      ry += (my - ry) * LERP;
      ring.style.left = rx + 'px';
      ring.style.top = ry + 'px';
      requestAnimationFrame(animCursor);
    }
    animCursor();

    const updateHovers = () => {
      document.querySelectorAll('a, button, .pill-btn, .btn-accent, .btn-outline, .work-row, .bc, .social-btn, .cp-card, .enlarge-trigger').forEach(el => {
        el.addEventListener('mouseenter', () => ring.classList.add('hover'));
        el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
      });
    };
    updateHovers();

    // ── Header scroll ──
    const header = document.querySelector('header');
    const backTop = document.getElementById('back-top');
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      header.classList.toggle('scrolled', y > 40);
      if (backTop) backTop.classList.toggle('on', y > 500);
    }, { passive: true });
    if (backTop) backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    // ── Hamburger ──
    const burger = document.getElementById('burger');
    const mOv = document.getElementById('m-overlay');
    const mNav = document.getElementById('m-nav');
    if (burger) {
      const close = () => {
        burger.classList.remove('open');
        mOv.classList.remove('open');
        mNav.classList.remove('open');
        document.body.style.overflow = '';
      };
      burger.addEventListener('click', () => {
        const o = burger.classList.toggle('open');
        mOv.classList.toggle('open', o);
        mNav.classList.toggle('open', o);
        document.body.style.overflow = o ? 'hidden' : '';
      });
      mOv.addEventListener('click', close);
      mNav.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
    }

    // ── Image Lightbox ──
    const initLightbox = () => {
      const triggers = document.querySelectorAll('.enlarge-trigger');
      if (triggers.length === 0) return;

      let lb = document.getElementById('lightbox');
      if (!lb) {
        lb = document.createElement('div');
        lb.id = 'lightbox';
        lb.innerHTML = `<div class="lb-content"><img src="" alt="Enlarged view"/><button class="lb-close">×</button></div>`;
        document.body.appendChild(lb);
        lb.addEventListener('click', e => { if (e.target.id === 'lightbox' || e.target.classList.contains('lb-close')) lb.classList.remove('active'); });
      }

      const lbImg = lb.querySelector('img');
      triggers.forEach(t => {
        t.addEventListener('click', e => { e.stopPropagation(); lbImg.src = t.src; lb.classList.add('active'); });
      });
    };
    initLightbox();

    // ── Scroll Reveal ──
    const initReveal = () => {
      const rvEls = document.querySelectorAll('.rv');
      const rvObs = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            rvObs.unobserve(e.target);
          }
        });
      }, { threshold: 0.1 });
      rvEls.forEach(el => rvObs.observe(el));
    };
    initReveal();

    // ── Active Nav ──
    const secs = document.querySelectorAll('section[id]');
    const navAs = document.querySelectorAll('.nav-links a, .m-nav a');
    const navObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting)
          navAs.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    secs.forEach(s => navObs.observe(s));

    // ── Animated Counters ──
    const initCounters = () => {
      const countEls = document.querySelectorAll('[data-count]');
      const cObs = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          const el = e.target;
          const target = parseInt(el.dataset.count, 10);
          const suf = el.dataset.suffix || '';
          let cur = 0;
          const step = Math.ceil(target / 40);
          const tick = () => {
            cur = Math.min(cur + step, target);
            el.textContent = cur + suf;
            if (cur < target) requestAnimationFrame(tick);
          };
          tick();
          cObs.unobserve(el);
        });
      }, { threshold: 0.5 });
      countEls.forEach(el => cObs.observe(el));
    };
    initCounters();

    // ── Magnetic Buttons ──
    document.querySelectorAll('.btn-accent, .btn-outline, .pill-btn').forEach(btn => {
      btn.addEventListener('mousemove', e => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.28;
        const y = (e.clientY - r.top - r.height / 2) * 0.28;
        btn.style.transform = `translate(${x}px,${y}px)`;
      });
      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
    });

    // ── Real-time clock ──
    const clockEl = document.getElementById('hero-clock');
    if (clockEl) {
      const tick = () => {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      };
      tick();
      setInterval(tick, 1000);
    }

    // ── Contact form ──
    const form = document.getElementById('contact-form');
    if (form) {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const btn = form.querySelector('[type=submit]');
        btn.textContent = 'Sent ✓';
        btn.style.background = '#DEFF00';
        btn.style.borderColor = '#DEFF00';
        btn.style.color = '#000';
        form.reset();
        setTimeout(() => {
          btn.textContent = 'Send it →';
          btn.style = '';
        }, 4000);
      });
    }
  }

  window.addEventListener('DOMContentLoaded', init);

})();
