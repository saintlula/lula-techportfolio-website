/**
 * App.jsx
 *
 * This is basically the "traffic controller" for the whole site.
 * It decides:
 * - when we're on the terminal style vs ocean blue style
 * - when a section is selected (ABOUT / RESUME / COVER)
 * - when to start zoom in / zoom out
 * - when to show the overlay UI bits (header, return button, prompts, style menu)
 *
 * FaultyTerminal does the heavy visual zooming. This file mostly coordinates state
 * so everything appears at the right time and feels synced.
 */

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import FaultyTerminal from './component/FaultyTerminal';
import Shuffle from './component/Shuffle';
import PageContent from './component/PageContent';
import OceanBlue from './component/OceanBlue';
import './App.css';

/** Tiny safety gap so we detect overlap a little early. */
const OVERLAP_GAP = 8;

/* Internal key -> display label used in the floating header. */
const WORD_LABELS = { about: 'ABOUT', resume: 'RESUME', cover: 'COVER' };

/**
 * Keep this array outside the component so React doesn't recreate it every render.
 * If we inline `[2, 1]`, the WebGL component would think props changed and do extra work.
 */
const FAULTY_TERMINAL_GRID_MUL = [2, 1];

/**
 * HoverShuffle — Wrapper that shows one text by default and another on hover, with Shuffle animation
 *
 * Why it exists:
 * - We want "ABOUT" / "RESUME" / "COVER" to switch to "CLICK" on hover. Shuffle animates
 *   character-by-character; when the text prop changes, we need GSAP to rebuild (split chars again).
 * - Remounting Shuffle (by changing its key when hover state changes) forces a fresh
 *   SplitText + timeline so the new word animates in correctly.
 *
 * triggerOnce=false in Shuffle means it runs the animation immediately on mount (no scroll
 * trigger), so each mount shows the shuffle animation for the current text (default or hover).
 */
const HoverShuffle = memo(function HoverShuffle({ defaultText, hoverText, onClick }) {
  /* True while pointer is over this label. */
  const [isHovered, setIsHovered] = useState(false);
  /* Bump key on enter/leave to force a clean Shuffle remount. */
  const [hoverKey, setHoverKey] = useState(0);
  const textToShow = isHovered ? hoverText : defaultText;

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    setHoverKey(prev => prev + 1);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setHoverKey(prev => prev + 1);
  }, []);

  /* Keyboard support for accessibility (Enter/Space = click). */
  const handleKeyDown = useCallback(e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  }, [onClick]);

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      style={{ cursor: 'pointer' }}
      role="button"
      tabIndex={0}
    >
      <Shuffle
        key={hoverKey}
        text={textToShow}
        loop={true}
        triggerOnce={false}
      />
    </div>
  );
});

function App() {
  const [siteVariant, setSiteVariant] = useState('terminal'); // 'terminal' | 'more'
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const styleMenuRef = useRef(null);

  const emailAddress = 'lulaworkau@gmail.com';
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [emailPromptMessage, setEmailPromptMessage] = useState('');

  /* ------------------------------
     Main view/zoom state
     ------------------------------ */

  /* User clicked one of the big labels; start zooming in. */
  const [transitionRequested, setTransitionRequested] = useState(false);
  /* Target point in normalized screen coords for zoom focus. */
  const [transitionTarget, setTransitionTarget] = useState(null);
  /* Which section is currently active (or null on home screen). */
  const [selectedWord, setSelectedWord] = useState(null);
  /* Once zoom settles, move header to top position. */
  const [headerAtTop, setHeaderAtTop] = useState(false);
  /* Return was pressed; run zoom-back and exit animations. */
  const [zoomBackRequested, setZoomBackRequested] = useState(false);
  /* If layout gets tight, slide header/return so they don't overlap content. */
  const [isCramped, setIsCramped] = useState(false);

  const headerRef = useRef(null);
  const returnRef = useRef(null);
  const contentPanelRef = useRef(null);

  const copyToClipboard = useCallback(async (value) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch {
      // Fallback for older browsers.
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

  const handleEmailLinkClick = useCallback((e) => {
    e.preventDefault();
    setEmailPromptMessage('');
    setShowEmailPrompt(true);
  }, []);

  const handleCopyEmail = useCallback(async () => {
    await copyToClipboard(emailAddress);
    setEmailPromptMessage('Email copied to clipboard.');
    window.setTimeout(() => {
      setShowEmailPrompt(false);
      setEmailPromptMessage('');
    }, 900);
  }, [copyToClipboard, emailAddress]);

  const handleOpenEmailApp = useCallback(() => {
    setShowEmailPrompt(false);
    setEmailPromptMessage('');
    window.location.href = `mailto:${emailAddress}`;
  }, [emailAddress]);

  const resetTerminalUi = useCallback(() => {
    setTransitionRequested(false);
    setTransitionTarget(null);
    setSelectedWord(null);
    setHeaderAtTop(false);
    setZoomBackRequested(false);
    setIsCramped(false);
  }, []);

  const openMoreDesign = useCallback(() => {
    resetTerminalUi();
    setShowStyleMenu(false);
    setSiteVariant('more');
  }, [resetTerminalUi]);

  const closeMoreDesign = useCallback(() => {
    setSiteVariant('terminal');
  }, []);

  /* -------------------------------------------------------------------------
     Handlers: all wrapped in useCallback so child components (e.g. HoverShuffle)
     don't re-render unnecessarily when other state changes.
     ------------------------------------------------------------------------- */

  /**
   * Called when the user clicks one of the three labels (ABOUT, RESUME, COVER).
   * Computes the click position in normalized coords (0–1), stores it as transition
   * target, sets the selected page, and asks the terminal to start the zoom transition.
   * Also resets headerAtTop so the header starts from the label position (CSS --start-x/y).
   */
  const handleWordClick = useCallback((target, e) => {
    const el = e?.currentTarget;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = 1 - (rect.top + rect.height / 2) / window.innerHeight;
    setSelectedWord(target);
    setTransitionTarget({ x, y });
    setTransitionRequested(true);
    setHeaderAtTop(false);
  }, []);

  /** Called by FaultyTerminal when the zoom-in transition has finished (1.1s). We only clear the request flag. */
  const handleTransitionComplete = useCallback(() => {
    setTransitionRequested(false);
  }, []);

  /** Called when the user clicks "Return". Starts zoom-back and triggers header/content exit (CSS classes). */
  const handleReturnClick = useCallback(() => {
    setHeaderAtTop(false);
    setIsCramped(false);
    setZoomBackRequested(true);
  }, []);

  /** Called by FaultyTerminal when the zoom-back has finished. We clear all "page" state and go back to the main view. */
  const handleZoomBackComplete = useCallback(() => {
    setZoomBackRequested(false);
    setSelectedWord(null);
    setTransitionTarget(null);
    setIsCramped(false);
  }, []);

  /** Detect if the content panel overlaps the header or Return button; set isCramped so they slide to the sides. */
  const checkOverlap = useCallback(() => {
    const header = headerRef.current;
    const returnBtn = returnRef.current;
    const panel = contentPanelRef.current;
    if (!header || !returnBtn || !panel) return;
    const headerRect = header.getBoundingClientRect();
    const returnRect = returnBtn.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const overlapsHeader = panelRect.top < headerRect.bottom + OVERLAP_GAP;
    const overlapsReturn = panelRect.bottom > returnRect.top - OVERLAP_GAP;
    setIsCramped(overlapsHeader || overlapsReturn);
  }, []);

  /* Stable per-page click handlers so HoverShuffle receives the same onClick reference and memo works. */
  const handleAboutClick = useCallback(e => handleWordClick('about', e), [handleWordClick]);
  const handleResumeClick = useCallback(e => handleWordClick('resume', e), [handleWordClick]);
  const handleCoverClick = useCallback(e => handleWordClick('cover', e), [handleWordClick]);

  /**
   * When a page is selected, we want the header to animate from the label position to the top.
   * We defer setting headerAtTop to true by two animation frames so the DOM has the initial
   * position (--start-x, --start-y) applied first; then the transition to top runs.
   */
  useEffect(() => {
    if (!selectedWord) return;
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => setHeaderAtTop(true));
    });
    return () => cancelAnimationFrame(t);
  }, [selectedWord]);

  /**
   * When a page is open and header is at top, detect if content panel overlaps header or Return.
   * Run after panel entrance animation (~700ms) and on resize; only when zoom-back is not in progress.
   */
  useEffect(() => {
    if (!selectedWord || !headerAtTop || zoomBackRequested) {
      return;
    }
    const runAfterLayout = () => {
      const t = setTimeout(checkOverlap, 800);
      return () => clearTimeout(t);
    };
    const cleanup = runAfterLayout();
    const onResize = () => checkOverlap();
    window.addEventListener('resize', onResize);
    return () => {
      cleanup?.();
      window.removeEventListener('resize', onResize);
    };
  }, [selectedWord, headerAtTop, zoomBackRequested, checkOverlap]);

  useEffect(() => {
    if (!showEmailPrompt) return;
    const onKeyDown = (ev) => {
      if (ev.key === 'Escape') {
        setShowEmailPrompt(false);
        setEmailPromptMessage('');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showEmailPrompt]);

  useEffect(() => {
    if (!showStyleMenu) return;
    const onPointerDown = (ev) => {
      if (!styleMenuRef.current?.contains(ev.target)) {
        setShowStyleMenu(false);
      }
    };
    const onKeyDown = (ev) => {
      if (ev.key === 'Escape') {
        setShowStyleMenu(false);
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [showStyleMenu]);

  useEffect(() => {
    if (siteVariant === 'more' || selectedWord) {
      setShowEmailPrompt(false);
      setEmailPromptMessage('');
    }
  }, [siteVariant, selectedWord]);

  return (
    <>
      {siteVariant === 'more' && <OceanBlue onBack={closeMoreDesign} />}
      <div className="app-container" style={siteVariant === 'more' ? { pointerEvents: 'none' } : undefined}>
      {/* Full-screen WebGL terminal; always mounted. It handles zoom and notifies us via callbacks. */}
      <FaultyTerminal
        scale={2.5}
        gridMul={FAULTY_TERMINAL_GRID_MUL}
        digitSize={1.2}
        timeScale={1}
        pause={siteVariant === 'more'}
        scanlineIntensity={1}
        glitchAmount={1}
        flickerAmount={1}
        noiseAmp={1}
        chromaticAberration={0}
        dither={0}
        curvature={0.15}
        tint="#7FAF7A"
        mouseReact={true}
        mouseStrength={0.5}
        pageLoadAnimation={true}
        brightness={1}
        transitionRequested={transitionRequested}
        transitionTarget={transitionTarget}
        onTransitionComplete={handleTransitionComplete}
        zoomBackRequested={zoomBackRequested}
        onZoomBackComplete={handleZoomBackComplete}
      />

      {/* Footer: only visible on main screen; slides down when a section is opened, slides back up when Return is clicked. */}
      <footer
        className={`app-footer ${selectedWord && !zoomBackRequested ? 'app-footer--off-screen' : ''}`}
        aria-label="Contact and location"
      >
        <div className="app-footer__inner">
          <span className="app-footer__item">
            <span className="app-footer__label">Email:</span>{' '}
            <button
              type="button"
              className="app-footer__link"
              onClick={handleEmailLinkClick}
              aria-haspopup="dialog"
              aria-expanded={showEmailPrompt}
              aria-controls="email-app-prompt"
            >
              {emailAddress}
            </button>
          </span>
          <span className="app-footer__separator" aria-hidden="true">·</span>
          <span className="app-footer__item">
            <span className="app-footer__label">GitHub:</span>{' '}
            <a href="https://github.com/saintlula" target="_blank" rel="noopener noreferrer" className="app-footer__link">saintlula</a>
          </span>
          <span className="app-footer__separator" aria-hidden="true">·</span>
          <span className="app-footer__item">Melbourne, Australia</span>
          <span className="app-footer__separator" aria-hidden="true">·</span>
          <span className="app-footer__item app-footer__copyright">&copy; 2026 Ehlinaz DY </span>
        </div>
      </footer>

      <div
        id="email-app-prompt"
        className={`app-email-prompt ${showEmailPrompt ? 'is-open' : ''}`}
        role="dialog"
        aria-label="Email options"
        aria-hidden={!showEmailPrompt}
      >
        <div className="app-email-prompt__title">
          would you like to copy the email or would you like me to direct you to the email app?
        </div>
        <div className="app-email-prompt__actions">
          <button
            type="button"
            className="app-email-prompt__btn app-email-prompt__btn--primary"
            onClick={handleCopyEmail}
          >
            Copy Email
          </button>
          <button
            type="button"
            className="app-email-prompt__btn"
            onClick={handleOpenEmailApp}
          >
            Open Email App
          </button>
          <button
            type="button"
            className="app-email-prompt__btn"
            onClick={() => {
              setShowEmailPrompt(false);
              setEmailPromptMessage('');
            }}
          >
            Close
          </button>
        </div>
        {emailPromptMessage ? <div className="app-email-prompt__note">{emailPromptMessage}</div> : null}
      </div>

      {selectedWord ? (
        <>
          {/* Header: shows the selected word (ABOUT/RESUME/COVER). When cramped, slides left so content doesn't cover it. */}
          <header
            ref={headerRef}
            className={`page-header ${headerAtTop ? 'page-header--at-top' : ''} ${headerAtTop && isCramped ? 'page-header--cramped' : ''} ${zoomBackRequested ? 'page-header--returning' : ''}`}
            style={{
              '--start-x': transitionTarget ? `${transitionTarget.x * 100}%` : '50%',
              '--start-y': transitionTarget ? `${(1 - transitionTarget.y) * 100}%` : '50%'
            }}
          >
            <Shuffle text={WORD_LABELS[selectedWord]} loop={true} triggerOnce={false} />
          </header>
          {/* Terminal-style content panel for the selected page; ref used to measure overlap with header/return. */}
          <PageContent ref={contentPanelRef} page={selectedWord} isReturning={zoomBackRequested} />
          <button
            ref={returnRef}
            type="button"
            className={`return-button return-button--zoomed ${isCramped ? 'return-button--cramped' : ''} ${zoomBackRequested ? 'return-button--hidden' : ''}`}
            onClick={handleReturnClick}
            aria-label="Return to main"
          >
            Return
          </button>
        </>
      ) : (
        /* Main view: three labels that switch to "CLICK" on hover and navigate on click. */
        <>
          <div ref={styleMenuRef} className={`style-menu ${showStyleMenu ? 'is-open' : ''}`}>
            <button
              type="button"
              className="more-portal-button"
              onClick={() => setShowStyleMenu(prev => !prev)}
              aria-label="Open style options"
              aria-expanded={showStyleMenu}
              aria-controls="style-menu-panel"
            >
              But wait there&apos;s more!
            </button>
            <div
              id="style-menu-panel"
              className={`style-menu__panel ${showStyleMenu ? 'is-open' : ''}`}
              role="dialog"
              aria-label="Style options"
              aria-hidden={!showStyleMenu}
            >
              <p className="style-menu__text">
                You&apos;re currently in the terminal style! Would you like to see a different style? You can go to:
              </p>
              <button
                type="button"
                className="style-menu__link"
                onClick={openMoreDesign}
                aria-label="Go to Ocean Blue style"
              >
                Ocean Blue
              </button>
              <p className="style-menu__note">Please note that it is the same content though!</p>
            </div>
          </div>
          <div className="click-stack">
            <HoverShuffle defaultText="ABOUT" hoverText="CLICK" onClick={handleAboutClick} />
            <HoverShuffle defaultText="RESUME" hoverText="CLICK" onClick={handleResumeClick} />
            <HoverShuffle defaultText="COVER" hoverText="CLICK" onClick={handleCoverClick} />
          </div>
        </>
      )}
      </div>
    </>
  );
}

export default App;
