import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './OceanBlue.css';

export default function OceanBlue({ onBack }) {
  const [screen, setScreen] = useState('landing'); // landing | about | resume | cover
  const [transition, setTransition] = useState(null); // { from, to, dir }
  const [fly, setFly] = useState(null); // { text, from: DOMRectLike, to: DOMRectLike }

  const pendingFlyRef = useRef(null); // { text, fromRect }
  const aboutTitleRef = useRef(null);
  const resumeTitleRef = useRef(null);
  const coverTitleRef = useRef(null);

  const reducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const dirFor = useCallback((from, to) => {
    if (from === to) return null;
    const order = ['landing', 'about', 'resume', 'cover'];
    const i = order.indexOf(from);
    const j = order.indexOf(to);
    if (i === -1 || j === -1) return 'right';
    if (from === 'landing' && to === 'about') return 'down';
    if (from === 'about' && to === 'landing') return 'up';
    return j > i ? 'right' : 'left';
  }, []);

  const go = useCallback((to, dir, opts) => {
    if (transition || screen === to) return;
    if (reducedMotion) {
      setScreen(to);
      return;
    }

    setFly(null);
    if (opts?.text && opts?.fromEl) {
      const r = opts.fromEl.getBoundingClientRect();
      pendingFlyRef.current = {
        text: opts.text,
        fromRect: { left: r.left, top: r.top, width: r.width, height: r.height }
      };
    } else {
      pendingFlyRef.current = null;
    }

    setTransition({ from: screen, to, dir });
  }, [reducedMotion, screen, transition]);

  const goTo = useCallback((to, opts) => {
    const dir = dirFor(screen, to);
    if (!dir) return;
    go(to, dir, opts);
  }, [dirFor, go, screen]);

  const onAnimEnd = useCallback(() => {
    if (!transition) return;
    setScreen(transition.to);
    setTransition(null);
    setFly(null);
  }, [transition]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const activeScreen = transition ? transition.from : screen;
  const incomingScreen = transition ? transition.to : null;
  const dir = transition?.dir;

  const showResume = screen === 'about' && !transition;
  const showCover = screen === 'resume' && !transition;

  useEffect(() => {
    if (!transition) return;
    const pending = pendingFlyRef.current;
    if (!pending) return;

    const getTargetEl = () => {
      if (transition.to === 'about') return aboutTitleRef.current;
      if (transition.to === 'resume') return resumeTitleRef.current;
      if (transition.to === 'cover') return coverTitleRef.current;
      return null;
    };

    const tick = () => {
      const targetEl = getTargetEl();
      if (!targetEl) return;
      const tr = targetEl.getBoundingClientRect();
      setFly({
        text: pending.text,
        from: pending.fromRect,
        to: { left: tr.left, top: tr.top, width: tr.width, height: tr.height }
      });
    };

    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [transition]);

  return (
    <div className="more-design" aria-label="Alternate design page">
      <header className="more-design__topbar">
        <button type="button" className="more-design__back" onClick={onBack} aria-label="Back to terminal site">
          Back to the previous design?
        </button>
        <nav className="more-design__topnav" aria-label="Alternate design navigation">
          <button type="button" className="more-design__topnav-link" onClick={() => goTo('about')}>
            ABOUT
          </button>
          <button type="button" className="more-design__topnav-link" onClick={() => goTo('resume')}>
            RESUME
          </button>
          <button type="button" className="more-design__topnav-link" onClick={() => goTo('cover')}>
            COVER
          </button>
        </nav>
      </header>

      <main className={`more-design__stage ${transition ? `more-design__stage--dir-${dir}` : ''}`}>
        <section className="more-design__panel more-design__panel--active" aria-label="Active screen">
          <ScreenView
            screen={activeScreen}
            onAbout={(fromEl) => goTo('about', { text: 'ABOUT', fromEl })}
            onToLanding={() => goTo('landing')}
            onToAbout={() => goTo('about')}
            onToResume={() => goTo('resume')}
            aboutTitleRef={aboutTitleRef}
            resumeTitleRef={resumeTitleRef}
            coverTitleRef={coverTitleRef}
          />
        </section>

        {incomingScreen && (
          <section
            className="more-design__panel more-design__panel--incoming"
            aria-label="Incoming screen"
            onAnimationEnd={onAnimEnd}
          >
            <ScreenView
              screen={incomingScreen}
              onAbout={() => {}}
              onToLanding={() => {}}
              onToAbout={() => {}}
              onToResume={() => {}}
              aboutTitleRef={aboutTitleRef}
              resumeTitleRef={resumeTitleRef}
              coverTitleRef={coverTitleRef}
            />
          </section>
        )}
      </main>

      {showResume && (
        <button
          type="button"
          className="more-design__nav more-design__nav--bottom more-design__transition-nav more-design__nav--about-resume"
          onClick={(e) => goTo('resume', { text: 'RESUME', fromEl: e.currentTarget })}
        >
          Resume
        </button>
      )}

      {showCover && (
        <button
          type="button"
          className="more-design__nav more-design__nav--bottom more-design__nav--blue more-design__transition-nav"
          onClick={(e) => goTo('cover', { text: 'COVER', fromEl: e.currentTarget })}
        >
          Cover
        </button>
      )}

      {transition && fly && (
        <div
          className="more-design__fly"
          aria-hidden="true"
          style={{
            '--from-x': `${fly.from.left}px`,
            '--from-y': `${fly.from.top}px`,
            '--to-x': `${fly.to.left}px`,
            '--to-y': `${fly.to.top}px`,
            '--fly-scale': String(fly.from.width > 0 ? (fly.to.width / fly.from.width) : 1)
          }}
        >
          {fly.text}
        </div>
      )}

      <footer className="more-design__footer" aria-label="Alternate design footer">
        <div className="more-design__footer-inner">
          <span className="more-design__footer-item">Email: <span className="more-design__footer-strong">PLACEHOLDER</span></span>
          <span className="more-design__footer-sep" aria-hidden="true">·</span>
          <span className="more-design__footer-item">GitHub: <span className="more-design__footer-strong">PLACEHOLDER</span></span>
          <span className="more-design__footer-sep" aria-hidden="true">·</span>
          <span className="more-design__footer-item">Melbourne, Australia</span>
        </div>
      </footer>
    </div>
  );
}

function ScreenView({
  screen,
  onAbout,
  onToLanding,
  onToAbout,
  onToResume,
  aboutTitleRef,
  resumeTitleRef,
  coverTitleRef
}) {
  if (screen === 'landing') {
    return (
      <div className="more-design__landing" aria-label="Landing">
        <button
          type="button"
          className="more-design__bigword"
          onClick={(e) => onAbout(e.currentTarget)}
          aria-label="Open about"
        >
          ABOUT
        </button>

        <div className="more-design__hero-block" aria-hidden="true" />
      </div>
    );
  }

  if (screen === 'about') {
    return (
      <div className="more-design__solid more-design__solid--blue" aria-label="About screen">
        <button type="button" className="more-design__arrow more-design__arrow--up more-design__arrow--blue" aria-label="Back to landing" onClick={onToLanding}>
          ↑
        </button>
        <div className="more-design__solid-inner">
          <div ref={aboutTitleRef} className="more-design__solid-title">ABOUT</div>
          <div className="more-design__solid-sub">PLACEHOLDER</div>
        </div>
      </div>
    );
  }

  if (screen === 'resume') {
    return (
      <div className="more-design__solid more-design__solid--amber" aria-label="Resume screen">
        <button type="button" className="more-design__arrow more-design__arrow--right more-design__arrow--blue" aria-label="Back to about" onClick={onToAbout}>
          →
        </button>
        <div className="more-design__solid-inner">
          <div ref={resumeTitleRef} className="more-design__solid-title">RESUME</div>
          <div className="more-design__solid-sub">PLACEHOLDER</div>
        </div>
      </div>
    );
  }

  return (
    <div className="more-design__solid more-design__solid--violet" aria-label="Cover screen">
      <button type="button" className="more-design__arrow more-design__arrow--right more-design__arrow--cream" aria-label="Back to resume" onClick={onToResume}>
        →
      </button>
      <div className="more-design__solid-inner">
        <div ref={coverTitleRef} className="more-design__solid-title">COVER</div>
        <div className="more-design__solid-sub">PLACEHOLDER</div>
      </div>
    </div>
  );
}

