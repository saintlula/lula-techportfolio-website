import { lazy, Suspense } from 'react';

const FaultyTerminal = lazy(() => import('./components/FaultyTerminal'));

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Suspense fallback={null}>
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
          curvature={0.08}
          tint="#A7EF9E"
          mouseReact={true}
          mouseStrength={0.5}
          pageLoadAnimation={false}
          brightness={1}
        />
      </Suspense>
    </div>
  );
}

export default App;
