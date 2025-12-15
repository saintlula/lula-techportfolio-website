import { useState } from 'react';
import FaultyTerminal from './component/FaultyTerminal';
import Shuffle from './component/Shuffle';
import './App.css';

/* 
  This component controls hover behavior.
  It forces Shuffle to remount when text changes
  so GSAP rebuilds correctly.
*/
function HoverShuffle({ defaultText, hoverText }) {
  const [isHovered, setIsHovered] = useState(false);

  const textToShow = isHovered ? hoverText : defaultText;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ cursor: 'pointer' }}
    >
      <Shuffle
        key={textToShow}  
        text={textToShow}
        loop={true}
        triggerOnce={true}
      />
    </div>
  );
}

function App() {
  return (
    <div className="app-container">
      {/* Background */}
      <FaultyTerminal
        scale={2.5}
        gridMul={[2, 1]}
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
      />

      {/* Centered Click Texts */}
      <div className="click-stack">
        <HoverShuffle defaultText="ABOUT" hoverText="CLICK" />
        <HoverShuffle defaultText="RESUME" hoverText="CLICK" />
        <HoverShuffle defaultText="COVER" hoverText="CLICK" />
      </div>
    </div>
  );
}

export default App;
