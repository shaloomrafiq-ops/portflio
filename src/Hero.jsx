import { Canvas } from '@react-three/fiber';
import { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import StoneScene from './stone/StoneScene.jsx';

gsap.registerPlugin(ScrollTrigger);

export default function Hero() {
  const heroRef = useRef(null);
  const progress = useRef(0);
  const burst = useRef(0);
  const barRef = useRef(null);
  const [active, setActive] = useState(true);

  useLayoutEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = gsap.context(() => {
      const state = { p: 0 };
      gsap.to(state, {
        p: 1,
        ease: 'none',
        scrollTrigger: { trigger: heroRef.current, start: 'top top', end: 'bottom bottom', scrub: reduce ? true : 1.2 },
        onUpdate: () => {
          progress.current = state.p;
          if (barRef.current) barRef.current.style.transform = `scaleX(${state.p})`;
        },
      });
      gsap.fromTo('.h-final', { autoAlpha: 0, y: 30 }, {
        autoAlpha: 1, y: 0, ease: 'none',
        scrollTrigger: { trigger: heroRef.current, start: '78% bottom', end: '95% bottom', scrub: 0.6 },
      });
    }, heroRef);

    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: '120px' });
    io.observe(heroRef.current);
    return () => { ctx.revert(); io.disconnect(); };
  }, []);

  return (
    <section className="hero" ref={heroRef} id="top">
      <h1 className="sr-only">Shaloom Rafiq, filmmaker and social media manager</h1>
      <div className="hero-sticky">
        <div className="hero-canvas" onPointerDown={() => { burst.current = performance.now() / 1000; }}>
          <Canvas
            dpr={[1, 1.75]}
            camera={{ fov: 35, position: [0, 0, 12], near: 0.1, far: 60 }}
            gl={{ antialias: true, powerPreference: 'high-performance' }}
            frameloop={active ? 'always' : 'never'}
          >
            <StoneScene progress={progress} burst={burst} />
          </Canvas>
        </div>
        <div className="vignette" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />

        <div className="h-final">
          <span className="h-kicker">Portfolio &middot; 2026</span>
          <p>Filmmaker &amp; social media manager</p>
          <div className="h-actions">
            <a className="btn solid magnetic" href="#contact">Work with me</a>
            <a className="btn ghost magnetic" href="#experience">See my experience</a>
          </div>
          <span className="hint">
            <span className="hint-fine">Move your cursor over the stone. Click it to break it.</span>
            <span className="hint-touch">Tap the stone to break it.</span>
          </span>
        </div>

        <div className="hero-bar" aria-hidden="true"><span ref={barRef} /></div>
      </div>
    </section>
  );
}
