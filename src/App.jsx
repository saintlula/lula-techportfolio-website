/**
 * App.jsx — Root component and navigation state
 *
 * This file controls the entire app flow:
 * - Renders the full-screen FaultyTerminal (WebGL background) at all times
 * - When no page is selected: shows three clickable labels (ABOUT, RESUME, COVER) that
 *   switch to "CLICK" on hover
 * - When a label is clicked: the terminal zooms toward that label's position, the label
 *   text moves to the top as a header, the PageContent panel appears, and a "Return" button
 *   appears at the bottom
 * - When "Return" is clicked: the zoom reverses, the header and content slide back, and
 *   we return to the three-label view
 *
 * All zoom/transition timing is driven by FaultyTerminal; App only sets flags and
 * passes callbacks so the UI (header, PageContent, Return button) stays in sync.
 */

import { useState, useEffect, useCallback, memo } from 'react';
import FaultyTerminal from './component/FaultyTerminal';
import Shuffle from './component/Shuffle';
import PageContent from './component/PageContent';
import './App.css';

/* Maps internal page keys to the label text shown in the header (e.g. selectedWord 'about' → 'ABOUT') */
const WORD_LABELS = { about: 'ABOUT', resume: 'RESUME', cover: 'COVER' };

/**
 * Stable grid multiplier for FaultyTerminal so its useEffect dependency doesn't change on
 * every App re-render (e.g. when transitionRequested or selectedWord changes). If we
 * passed [2, 1] inline, a new array would be created each render and FaultyTerminal
 * would re-run its WebGL setup unnecessarily.
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
  /* true when the user's pointer is over this element */
  const [isHovered, setIsHovered] = useState(false);
  /* Incremented on every hover enter/leave so Shuffle gets a new key and remounts (GSAP rebuild) */
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

  /* Keyboard activation: Enter or Space triggers the same action as click (accessibility) */
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
  /* -------------------------------------------------------------------------
     State that drives the zoom and "page" view
     ------------------------------------------------------------------------- */

  /* True when user has just clicked ABOUT/RESUME/COVER; tells FaultyTerminal to start zooming toward the click point */
  const [transitionRequested, setTransitionRequested] = useState(false);
  /* { x, y } in 0–1 normalized coords (center of the clicked label); FaultyTerminal zooms toward this point */
  const [transitionTarget, setTransitionTarget] = useState(null);
  /* Which page is selected: 'about' | 'resume' | 'cover' or null when on the main three-label view */
  const [selectedWord, setSelectedWord] = useState(null);
  /* True after the zoom has settled; moves the header from the label position to the top of the screen (CSS transition) */
  const [headerAtTop, setHeaderAtTop] = useState(false);
  /* True when user has clicked "Return"; tells FaultyTerminal to zoom back and triggers header/content exit animations */
  const [zoomBackRequested, setZoomBackRequested] = useState(false);

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
    setZoomBackRequested(true);
  }, []);

  /** Called by FaultyTerminal when the zoom-back has finished. We clear all "page" state and go back to the main view. */
  const handleZoomBackComplete = useCallback(() => {
    setZoomBackRequested(false);
    setSelectedWord(null);
    setTransitionTarget(null);
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

  return (
    <div className="app-container">
      {/* Full-screen WebGL terminal; always mounted. It handles zoom and notifies us via callbacks. */}
      <FaultyTerminal
        scale={2.5}
        gridMul={FAULTY_TERMINAL_GRID_MUL}
        digitSize={1.2}
        timeScale={1}
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

      {selectedWord ? (
        <>
          {/* Header: shows the selected word (ABOUT/RESUME/COVER). Starts at the label position (--start-x/y) and moves to top when headerAtTop is true. */}
          <header
            className={`page-header ${headerAtTop ? 'page-header--at-top' : ''} ${zoomBackRequested ? 'page-header--returning' : ''}`}
            style={{
              '--start-x': transitionTarget ? `${transitionTarget.x * 100}%` : '50%',
              '--start-y': transitionTarget ? `${(1 - transitionTarget.y) * 100}%` : '50%'
            }}
          >
            <Shuffle text={WORD_LABELS[selectedWord]} loop={true} triggerOnce={false} />
          </header>
          {/* Terminal-style content panel for the selected page; slides right and fades out when isReturning is true. */}
          <PageContent page={selectedWord} isReturning={zoomBackRequested} />
          <button
            type="button"
            className="return-button return-button--zoomed"
            onClick={handleReturnClick}
            aria-label="Return to main"
          >
            Return
          </button>
        </>
      ) : (
        /* Main view: three labels that switch to "CLICK" on hover and navigate on click. */
        <div className="click-stack">
          <HoverShuffle defaultText="ABOUT" hoverText="CLICK" onClick={handleAboutClick} />
          <HoverShuffle defaultText="RESUME" hoverText="CLICK" onClick={handleResumeClick} />
          <HoverShuffle defaultText="COVER" hoverText="CLICK" onClick={handleCoverClick} />
        </div>
      )}
    </div>
  );
}

export default App;
