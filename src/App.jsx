import FaultyTerminal from './component/FaultyTerminal';
import Shuffle from './component/Shuffle';
import './App.css';

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
        curvature={0.10}
        tint="#A7EF9E"
        mouseReact={true}
        mouseStrength={0.5}
        pageLoadAnimation={true}
        brightness={1}
      />

      {/* Centered Click Texts */}
      <div className="click-stack">
        <Shuffle text="CLICK" />
        <Shuffle text="CLICK" />
        <Shuffle text="CLICK" />
      </div>
    </div>
  );
}

export default App;
