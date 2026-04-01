import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './OceanBlue.css';

export default function OceanBlue({ onBack }) {
  const [screen, setScreen] = useState('landing'); // landing | about | resume | cover
  const [transition, setTransition] = useState(null); // { from, to, dir }
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [emailPromptMessage, setEmailPromptMessage] = useState('');
  const emailAddress = 'lulaworkau@gmail.com';
  const [landingWord, setLandingWord] = useState('ABOUT');

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
  }, [transition]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const copyToClipboard = useCallback(async (value) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = value;
      textArea.setAttribute('readonly', '');
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }, []);

  const openEmailPrompt = useCallback(() => {
    setEmailPromptMessage('');
    setShowEmailPrompt(true);
  }, []);

  const handleCopyEmail = useCallback(async () => {
    await copyToClipboard(emailAddress);
    setEmailPromptMessage('Email copied to clipboard.');
  }, [copyToClipboard, emailAddress]);

  const handleOpenEmailApp = useCallback(() => {
    window.location.href = `mailto:${emailAddress}`;
    setShowEmailPrompt(false);
  }, [emailAddress]);

  const activeScreen = transition ? transition.from : screen;
  const incomingScreen = transition ? transition.to : null;
  const dir = transition?.dir;

  const showResume = screen === 'about' && !transition;

  useEffect(() => {
    if (reducedMotion) return;
    if (screen !== 'landing' || transition) return;

    const delayMs = landingWord === 'ABOUT' ? 1000 : 700;
    const t = window.setTimeout(() => {
      setLandingWord(prev => (prev === 'ABOUT' ? 'CLICK' : 'ABOUT'));
    }, delayMs);

    return () => window.clearTimeout(t);
  }, [landingWord, reducedMotion, screen, transition]);

  // Intentionally no "fly label" overlay during transitions.

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
            onToCover={(fromEl) => goTo('cover', { text: 'COVER', fromEl })}
            aboutTitleRef={aboutTitleRef}
            resumeTitleRef={resumeTitleRef}
            coverTitleRef={coverTitleRef}
            landingWord={landingWord}
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
              onToCover={() => {}}
              aboutTitleRef={aboutTitleRef}
              resumeTitleRef={resumeTitleRef}
              coverTitleRef={coverTitleRef}
              landingWord={landingWord}
            />
          </section>
        )}
      </main>

      {showResume && (
        <button
          type="button"
          className="more-design__nav more-design__nav--about-resume"
          onClick={(e) => goTo('resume', { text: 'RESUME', fromEl: e.currentTarget })}
          aria-label="Resume"
        >
          <span>R</span>
          <span>E</span>
          <span>S</span>
          <span>U</span>
          <span>M</span>
          <span>E</span>
        </button>
      )}

      {/* COVER nav is rendered inside the RESUME screen */}

      <footer className="more-design__footer" aria-label="Alternate design footer">
        <div className="more-design__footer-inner">
          <span className="more-design__footer-item">
            Email:{' '}
            <button
              type="button"
              className="more-design__footer-link"
              onClick={openEmailPrompt}
              aria-expanded={showEmailPrompt}
              aria-controls="email-contact-prompt"
            >
              <span className="more-design__footer-strong">{emailAddress}</span>
            </button>
          </span>
          <span className="more-design__footer-sep" aria-hidden="true">·</span>
          <span className="more-design__footer-item">
            GitHub:{' '}
            <a
              className="more-design__footer-link"
              href="https://github.com/saintlula"
              target="_blank"
              rel="noreferrer noopener"
              aria-label="Open GitHub profile in a new tab"
            >
              <span className="more-design__footer-strong">saintlula</span>
            </a>
          </span>
          <span className="more-design__footer-sep" aria-hidden="true">·</span>
          <span className="more-design__footer-item">Melbourne, Australia</span>
        </div>
      </footer>

      <div
        id="email-contact-prompt"
        className={`more-design__email-prompt ${showEmailPrompt ? 'is-open' : ''}`}
        role="dialog"
        aria-label="Email options"
        aria-hidden={!showEmailPrompt}
      >
        <div className="more-design__email-prompt-title">
          Would you like to copy the email or open your email app?
        </div>
        <div className="more-design__email-prompt-actions">
          <button type="button" className="more-design__email-btn" onClick={handleCopyEmail}>
            Copy Email
          </button>
          <button type="button" className="more-design__email-btn" onClick={handleOpenEmailApp}>
            Open Email App
          </button>
          <button
            type="button"
            className="more-design__email-btn more-design__email-btn--ghost"
            onClick={() => setShowEmailPrompt(false)}
          >
            Close
          </button>
        </div>
        {emailPromptMessage ? <div className="more-design__email-prompt-note">{emailPromptMessage}</div> : null}
      </div>
    </div>
  );
}

function ScreenView({
  screen,
  onAbout,
  onToLanding,
  onToAbout,
  onToResume,
  onToCover,
  aboutTitleRef,
  resumeTitleRef,
  coverTitleRef,
  landingWord
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
          {landingWord || 'ABOUT'}
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
        <div className="more-design__solid-inner more-design__solid-inner--about">
          <div ref={aboutTitleRef} className="more-design__solid-title">ABOUT</div>
          <div className="more-design__content-block more-design__content-block--about">
            <p>
              First of all, thank you for taking the time to visit my website! My name is Ehlinaz, though I often go by Lula. I'm a recent university graduate with a background in software engineering and a passion for building (or trying to build) things.
            </p>
            <p>
              I created this site for a few reasons however mainly because I believe portfolios should be more than a list of skills on a page. And because 'proficient in React' on a CV doesn't really tell you much. Especially not how someone thinks or codes, so I wanted to give a better look at that.
            </p>
            <p>
              This website itself is part of that process. It was built with the help of open-source tools, design inspiration from the React ecosystem, and a lot of time spent reading documentation written by developers who care deeply about their craft.
            </p>
            <p>
              More than anything, this page exists to show curiosity, intention, and growth. I'd like to say it's not about perfection, it's about momentum.
            </p>
          </div>
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
        <button
          type="button"
          className="more-design__nav more-design__nav--resume-cover"
          onClick={(e) => onToCover(e.currentTarget)}
          aria-label="Cover"
        >
          <span>C</span>
          <span>O</span>
          <span>V</span>
          <span>E</span>
          <span>R</span>
        </button>
        <div className="more-design__solid-inner">
          <div ref={resumeTitleRef} className="more-design__solid-title">RESUME</div>
          <div className="more-design__solid-sub">
            <a href="/LulaITResume.pdf" target="_blank" rel="noopener noreferrer">
              open my resume
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="more-design__solid more-design__solid--violet" aria-label="Cover screen">
      <button type="button" className="more-design__arrow more-design__arrow--right more-design__arrow--cream" aria-label="Back to resume" onClick={onToResume}>
        →
      </button>
      <div className="more-design__solid-inner more-design__solid-inner--cover">
        <div ref={coverTitleRef} className="more-design__solid-title">COVER</div>
        <div className="more-design__content-block more-design__content-block--cover">
          <p>
            I'm a software engineering graduate with hands-on experience in JavaScript, React Native, and mobile development. I also have a background in C++, which gave me a solid foundation in how software works at a lower level, and I think that carries over into how I approach problems generally. I'm early in my career and still figuring out where I fit in the industry.
          </p>
          <p>
            And again as a new graduate, I'm very aware that there is still a lot I don't know. What I try to bring instead is curiosity, persistence, and a genuine interest in understanding how things work. I'm comfortable reading documentation, learning unfamiliar tools and I enjoy the process of improving through iteration.
          </p>
          <p>
            This portfolio exists to hopefully show my approach more clearly than a traditional cover letter can. Rather than listing skills, I wanted to demonstrate how I think, how I learn, and how I translate ideas into working software.
          </p>
          <p>
            I'm looking for opportunities where I can contribute, keep learning, and grow alongside more experienced engineers, while doing work that is thoughtful, practical, and well-built.
          </p>
        </div>
      </div>
    </div>
  );
}

