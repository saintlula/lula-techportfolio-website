import { useState, useEffect } from 'react';
import FaultyTerminal from './component/FaultyTerminal';
import Shuffle from './component/Shuffle';
import PageContent from './component/PageContent';
import './App.css';

const WORD_LABELS = { about: 'ABOUT', resume: 'RESUME', cover: 'COVER' };

// Stable ref so FaultyTerminal's effect does not re-run on every App re-render (e.g. on click)
const FAULTY_TERMINAL_GRID_MUL = [2, 1];

/*
  Hover behavior: remount Shuffle on enter/leave so GSAP rebuilds.
  triggerOnce=false in Shuffle runs create() immediately so text switches work.
*/
function HoverShuffle({ defaultText, hoverText, onClick }) {
  const [isHovered, setIsHovered] = useState(false);
  const [hoverKey, setHoverKey] = useState(0);
  const textToShow = isHovered ? hoverText : defaultText;

  const handleMouseEnter = () => {
    setIsHovered(true);
    setHoverKey(prev => prev + 1);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setHoverKey(prev => prev + 1);
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }}
    >
      <Shuffle
        key={hoverKey}
        text={textToShow}
        loop={true}
        triggerOnce={false}
      />
    </div>
  );
}


function App() {
  const [transitionRequested, setTransitionRequested] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState(null);
  const [selectedWord, setSelectedWord] = useState(null);
  const [headerAtTop, setHeaderAtTop] = useState(false);
  const [zoomBackRequested, setZoomBackRequested] = useState(false);

  const handleWordClick = (target, e) => {
    const el = e?.currentTarget;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = 1 - (rect.top + rect.height / 2) / window.innerHeight;
    setSelectedWord(target);
    setTransitionTarget({ x, y });
    setTransitionRequested(true);
    setHeaderAtTop(false);
  };

  const handleTransitionComplete = () => {
    setTransitionRequested(false);
  };

  const handleReturnClick = () => {
    setHeaderAtTop(false); // animate header back to original position
    setZoomBackRequested(true);
  };

  const handleZoomBackComplete = () => {
    setZoomBackRequested(false);
    setSelectedWord(null);
    setTransitionTarget(null);
  };

  useEffect(() => {
    if (!selectedWord) return;
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => setHeaderAtTop(true));
    });
    return () => cancelAnimationFrame(t);
  }, [selectedWord]);

  return (
    <div className="app-container">
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
          <header
            className={`page-header ${headerAtTop ? 'page-header--at-top' : ''} ${zoomBackRequested ? 'page-header--returning' : ''}`}
            style={{
              '--start-x': transitionTarget ? `${transitionTarget.x * 100}%` : '50%',
              '--start-y': transitionTarget ? `${(1 - transitionTarget.y) * 100}%` : '50%'
            }}
          >
            <Shuffle text={WORD_LABELS[selectedWord]} loop={true} triggerOnce={false} />
          </header>
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
        <div className="click-stack">
          <HoverShuffle defaultText="ABOUT" hoverText="CLICK" onClick={e => handleWordClick('about', e)} />
          <HoverShuffle defaultText="RESUME" hoverText="CLICK" onClick={e => handleWordClick('resume', e)} />
          <HoverShuffle defaultText="COVER" hoverText="CLICK" onClick={e => handleWordClick('cover', e)} />
        </div>
      )}
    </div>
  );
}

export default App;
