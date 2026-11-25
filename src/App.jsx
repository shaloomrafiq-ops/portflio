import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Hero from './Hero.jsx';

gsap.registerPlugin(ScrollTrigger);

const EMAIL = 'strv.shaloomrafiq@gmail.com';

const ABOUT =
  "I'm Shaloom Rafiq, a media school graduate and filmmaker. I've managed social media for more than two and a half years, co-hosted a show on FM radio, run my own livestock business, competed in athletics and worked on crypto testnets. Today I put all of that into making films.";

const experience = [
  { ghost: 'Film', tag: 'Current focus', title: 'Filmmaker', text: 'Shooting and editing video, and building my body of work one project at a time.', hot: true },
  { ghost: 'Social', tag: '2.5+ years', title: 'Social Media Manager', text: 'Content plans, posts, captions and short videos, managed every week.' },
  { ghost: 'Radio', tag: 'Radio', title: 'FM Radio Co-host', text: 'Co-hosted a show live on air.' },
  { ghost: 'Livestock', tag: 'Business', title: 'Livestock Business', text: 'Ran my own livestock business, handling the animals, the customers and the money.' },
  { ghost: 'Testnets', tag: 'Tech', title: 'Crypto Testnets', text: 'Tested blockchain projects before launch and reported problems.' },
  { ghost: 'Track', tag: 'Sport', title: 'Athletics', text: 'Competed as an athlete, which taught me discipline and how to train toward a goal.' },
];

const services = [
  { title: 'Video production', text: 'Short films, interviews and event videos, from filming through the final edit.', items: ['Filming', 'Editing', 'Short films', 'Interviews'] },
  { title: 'Social media management', text: 'A plan for what to post, plus the posts, captions and short videos to go with it.', items: ['Content plans', 'Captions', 'Reels & shorts', 'Account management'] },
  { title: 'Church & ministry media', text: 'Testimonies, event coverage and content for churches and ministries.', items: ['Testimonies', 'Event coverage', 'Social content'] },
];

/** Heading whose letters rise into place when scrolled to. */
function Split({ as: Tag = 'h2', text, className = '' }) {
  return (
    <Tag className={`split ${className}`} aria-label={text}>
      {text.split(' ').map((word, wi) => (
        <span className="split-word" aria-hidden="true" key={wi}>
          {[...word].map((ch, ci) => <span className="ch" key={ci}>{ch}</span>)}
          {' '}
        </span>
      ))}
    </Tag>
  );
}

/** A warm dot and ring that follow the mouse and grow over anything clickable. */
function Cursor() {
  const dot = useRef(null);
  const ring = useRef(null);
  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return undefined;
    document.body.classList.add('has-cursor');
    const dx = gsap.quickTo(dot.current, 'x', { duration: 0.08 });
    const dy = gsap.quickTo(dot.current, 'y', { duration: 0.08 });
    const rx = gsap.quickTo(ring.current, 'x', { duration: 0.45, ease: 'power3' });
    const ry = gsap.quickTo(ring.current, 'y', { duration: 0.45, ease: 'power3' });
    const move = (e) => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); };
    const over = (e) => {
      const hot = e.target.closest('a, button');
      const panel = e.target.closest('.panel, .svc-card');
      const stone = e.target.closest('.hero-canvas');
      ring.current.dataset.state = hot ? 'link' : panel ? 'panel' : stone ? 'stone' : '';
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerover', over);
    return () => {
      document.body.classList.remove('has-cursor');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerover', over);
    };
  }, []);
  return (
    <>
      <div className="cursor-ring" ref={ring} aria-hidden="true"><span /></div>
      <div className="cursor-dot" ref={dot} aria-hidden="true" />
    </>
  );
}

export default function App() {
  const root = useRef(null);
  const [copied, setCopied] = useState('Copy email');

  useLayoutEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = gsap.context(() => {
      // Headings: letters rise in.
      gsap.utils.toArray('.split').forEach((el) => {
        gsap.from(el.querySelectorAll('.ch'), {
          yPercent: 110, rotate: 8, opacity: 0, stagger: 0.025, duration: 0.9, ease: 'power4.out',
          scrollTrigger: { trigger: el, start: 'top 85%' },
        });
      });

      // About: words light up as you read down.
      gsap.fromTo('.w', { opacity: 0.14 }, {
        opacity: 1, stagger: 0.05, ease: 'none',
        scrollTrigger: { trigger: '.words', start: 'top 80%', end: 'bottom 45%', scrub: true },
      });

      gsap.utils.toArray('[data-count]').forEach((el) => {
        const end = parseFloat(el.dataset.count);
        const dec = el.dataset.count.includes('.') ? 1 : 0;
        const o = { v: 0 };
        gsap.to(o, {
          v: end, duration: 1.6, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 90%' },
          onUpdate: () => { el.textContent = o.v.toFixed(dec); },
        });
      });

      // Experience: horizontal scroll; panels lean with the scroll speed.
      const mm = gsap.matchMedia();
      mm.add('(min-width: 901px)', () => {
        const track = document.querySelector('.xp-track');
        const dist = () => track.scrollWidth - window.innerWidth + 48;
        const skewTo = gsap.quickSetter('.panel', 'skewX', 'deg');
        const lean = { v: 0 };
        gsap.to(track, {
          x: () => -dist(), ease: 'none',
          scrollTrigger: {
            trigger: '.xp', pin: true, start: 'top top', end: () => '+=' + dist(), scrub: 1, invalidateOnRefresh: true,
            onUpdate: (st) => {
              gsap.set('.xp-progress span', { scaleX: st.progress });
              if (reduce) return;
              const v = gsap.utils.clamp(-7, 7, st.getVelocity() / -260);
              if (Math.abs(v) > Math.abs(lean.v)) {
                lean.v = v;
                gsap.to(lean, { v: 0, duration: 0.8, ease: 'power3', overwrite: true, onUpdate: () => skewTo(lean.v) });
              }
            },
          },
        });
      });

      // Education: outlined words fill in as they scroll past.
      gsap.utils.toArray('.outline').forEach((el) => {
        gsap.fromTo(el, { backgroundPositionX: '100%' }, {
          backgroundPositionX: '0%', ease: 'none',
          scrollTrigger: { trigger: el, start: 'top 85%', end: 'top 35%', scrub: true },
        });
      });

      // Services: cards tilt back slightly as the next one covers them.
      gsap.utils.toArray('.svc-card').forEach((card, i, all) => {
        if (i === all.length - 1) return;
        gsap.to(card, {
          scale: 0.94, filter: 'brightness(0.55)', ease: 'none',
          scrollTrigger: { trigger: all[i + 1], start: 'top bottom', end: 'top 20%', scrub: true },
        });
      });

      // Contact marquee: speeds up and flips direction with your scroll.
      if (!reduce) {
        const mq = gsap.to('.marquee-inner', { xPercent: -50, repeat: -1, duration: 30, ease: 'none' });
        ScrollTrigger.create({
          trigger: '.contact', start: 'top bottom', end: 'bottom top',
          onUpdate: (st) => {
            const v = st.getVelocity();
            const dir = v < 0 ? -1 : 1;
            gsap.to(mq, {
              timeScale: dir * (1 + Math.min(Math.abs(v) / 300, 5)), duration: 0.2, overwrite: true,
              onComplete: () => gsap.to(mq, { timeScale: dir, duration: 1.2, overwrite: true }),
            });
          },
        });
      }

      gsap.utils.toArray('.rise').forEach((el) => {
        gsap.from(el, { y: 40, opacity: 0, duration: 1, ease: 'power3.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: el, start: 'top 88%' } });
      });
    }, root);

    // Magnetic buttons.
    const cleanups = [];
    if (window.matchMedia('(pointer: fine)').matches) {
      document.querySelectorAll('.magnetic').forEach((el) => {
        const move = (e) => {
          const r = el.getBoundingClientRect();
          gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.3, y: (e.clientY - r.top - r.height / 2) * 0.4, duration: 0.4, ease: 'power3' });
        };
        const leave = () => gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)' });
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerleave', leave);
        cleanups.push(() => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); });
      });
    }

    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    return () => { ctx.revert(); cleanups.forEach((f) => f()); };
  }, []);

  const copy = () => {
    const done = () => { setCopied('Copied'); setTimeout(() => setCopied('Copy email'), 1800); };
    try {
      navigator.clipboard.writeText(EMAIL).then(done, () => setCopied('Select the email above'));
    } catch {
      setCopied('Select the email above');
    }
  };

  return (
    <div ref={root}>
      <Cursor />
      <header className="nav">
        <div className="wrap">
          <a className="logo" href="#top">Shaloom Rafiq</a>
          <nav aria-label="Main">
            <a href="#about">About</a>
            <a href="#experience">Experience</a>
            <a href="#education">Education</a>
            <a href="#services">Services</a>
            <a className="cta" href="#contact">Contact</a>
          </nav>
        </div>
      </header>

      <Hero />

      <main>
        <section className="about" id="about">
          <div className="wrap">
            <p className="kicker">About</p>
            <p className="words">
              {ABOUT.split(' ').map((w, i) => <span className="w" key={i}>{w} </span>)}
            </p>
            <div className="stats">
              <div className="stat rise"><span className="num"><span data-count="2.5">2.5</span>+</span><span>years managing social media</span></div>
              <div className="stat rise"><span className="num"><span data-count="6">6</span></span><span>fields I've worked in</span></div>
            </div>
          </div>
        </section>

        <section className="xp" id="experience">
          <div className="xp-head wrap">
            <p className="kicker">Experience</p>
            <Split text="Where I've worked" />
          </div>
          <div className="xp-track">
            {experience.map((x) => (
              <article className={`panel${x.hot ? ' hot' : ''}`} key={x.title}>
                <span className="ghost" aria-hidden="true">{x.ghost}</span>
                <span className="tag">{x.tag}</span>
                <div>
                  <h3>{x.title}</h3>
                  <p>{x.text}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="xp-progress wrap" aria-hidden="true"><span /></div>
        </section>

        <section className="edu" id="education">
          <div className="wrap">
            <p className="kicker">Education</p>
            <div className="edu-item">
              <span className="outline">Media School</span>
              <span className="edu-meta">Graduate</span>
            </div>
            <div className="edu-item">
              <span className="outline">FA</span>
              <span className="edu-meta">Intermediate</span>
            </div>
          </div>
        </section>

        <section className="svc" id="services">
          <div className="wrap">
            <p className="kicker">Services</p>
            <Split text="What I do" className="svc-title" />
            <div className="svc-stack">
              {services.map((s, i) => (
                <article className="svc-card" style={{ '--i': i }} key={s.title}>
                  <h3>{s.title}</h3>
                  <div className="svc-body">
                    <p>{s.text}</p>
                    <ul>{s.items.map((it) => <li key={it}>{it}</li>)}</ul>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="contact" id="contact">
          <div className="marquee" aria-hidden="true">
            <div className="marquee-inner">
              {Array.from({ length: 2 }).map((_, k) => (
                <span key={k}>Let's work together <i>&bull;</i> Let's work together <i>&bull;</i> Let's work together <i>&bull;</i> </span>
              ))}
            </div>
          </div>
          <div className="wrap contact-body">
            <p className="contact-lede rise">Have a video project or need help with your social media? Send me an email.</p>
            <div className="mail-row rise">
              <a className="mail" href={`mailto:${EMAIL}`}>{EMAIL}</a>
              <button className="btn solid magnetic" type="button" onClick={copy}>{copied}</button>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap"><span>&copy; 2026 Shaloom Rafiq</span><span>Filmmaker &amp; social media manager</span></div>
      </footer>
    </div>
  );
}
