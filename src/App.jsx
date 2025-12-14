import { useState, lazy, Suspense } from 'react';
import BootScreen from './components/BootScreen';

const FaultyTerminal = lazy(() => import('./components/FaultyTerminal'));

function App() {
  const [bootDone, setBootDone] = useState(false);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {!bootDone && <BootScreen onFinish={() => setBootDone(true)} />}

      {bootDone && (
        <Suspense fallback={null}>
          <div
            style={{
              opacity: bootDone ? 1 : 0,
              transition: 'opacity 0.6s ease'
            }}
          >
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
          </div>
        </Suspense>
      )}
    </div>
  );
}

export default App;
