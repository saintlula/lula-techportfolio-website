/**
 * FaultyTerminal.jsx — Full-screen WebGL "faulty terminal" background
 *
 * Renders a full-screen shader that looks like a glitchy, scanline CRT with a
 * grid of digit-like cells that react to time, mouse, and a "zoom" transition.
 *
 * Behaviour:
 * - On load: optional cell-by-cell fade-in (pageLoadAnimation).
 * - Mouse: optional glow/ripple around cursor (mouseReact, mouseStrength).
 * - Zoom: when App sets transitionRequested + transitionTarget, the shader
 *   zooms toward that point (uGatherProgress 0 → 1 over 1.1s). When App sets
 *   zoomBackRequested, it zooms back (uGatherProgress 1 → 0) and calls
 *   onZoomBackComplete when done.
 *
 * Performance:
 * - Renders at 88% resolution then scales canvas to full size (fewer pixels).
 * - DPR capped at 1.5. Antialiasing off.
 * - When the tab is hidden (Page Visibility API), the loop runs at ~10 fps
 *   instead of 60 fps. Resize is throttled.
 */

import { Renderer, Program, Mesh, Color, Triangle } from 'ogl';
import { useEffect, useRef, useMemo, useCallback } from 'react';
import './FaultyTerminal.css';

/* -----------------------------------------------------------------------------
   Vertex shader
   -----------------------------------------------------------------------------
   Draws a full-screen triangle; passes through UVs (0–1) for the fragment shader.
   No transforms; the fragment shader does all the work in UV space.
   ----------------------------------------------------------------------------- */

const vertexShader = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

/* -----------------------------------------------------------------------------
   Fragment shader (GLSL)
   -----------------------------------------------------------------------------
   For each pixel:
   1. Transforms UV (optionally barrel distortion).
   2. When zooming (uGatherProgress > 0), warps UV and mouse so the "gather"
      effect is centered on the click point and stays in sync.
   3. Computes a "digit" grid: each cell's brightness comes from pattern()
      (FBM noise) plus optional mouse glow and optional page-load fade.
   4. Adds scanlines, horizontal displacement (glitch), and optional chromatic
      aberration, tint, dither.
   ----------------------------------------------------------------------------- */

const fragmentShader = `
precision mediump float;

varying vec2 vUv;

uniform float iTime;
uniform vec3  iResolution;
uniform float uScale;

uniform vec2  uGridMul;
uniform float uDigitSize;
uniform float uScanlineIntensity;
uniform float uGlitchAmount;
uniform float uFlickerAmount;
uniform float uNoiseAmp;
uniform float uChromaticAberration;
uniform float uDither;
uniform float uCurvature;
uniform vec3  uTint;
uniform vec2  uMouse;
uniform float uMouseStrength;
uniform float uUseMouse;
uniform float uPageLoadProgress;
uniform float uUsePageLoadAnimation;
uniform float uBrightness;
uniform float uGatherProgress;
uniform vec2  uTargetPos;

float time;
float grainTime;
vec2 mouseSamplingPos;

float hash21(vec2 p){
  p = fract(p * 234.56);
  p += dot(p, p + 34.56);
  return fract(p.x * p.y);
}

float noise(vec2 p)
{
  return sin(p.x * 10.0) * sin(p.y * (3.0 + sin(grainTime * 0.090909))) + 0.2; 
}

mat2 rotate(float angle)
{
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

float fbm(vec2 p)
{
  p *= 1.1;
  float f = 0.0;
  float amp = 0.5 * uNoiseAmp;
  
  mat2 modify0 = rotate(grainTime * 0.02);
  f += amp * noise(p);
  p = modify0 * p * 2.0;
  amp *= 0.454545;
  
  mat2 modify1 = rotate(grainTime * 0.02);
  f += amp * noise(p);
  p = modify1 * p * 2.0;
  amp *= 0.454545;
  
  mat2 modify2 = rotate(grainTime * 0.08);
  f += amp * noise(p);
  
  return f;
}

float pattern(vec2 p, out vec2 q, out vec2 r) {
  vec2 offset1 = vec2(1.0);
  vec2 offset0 = vec2(0.0);
  mat2 rot01 = rotate(0.1 * grainTime);
  mat2 rot1 = rotate(0.1);
  
  q = vec2(fbm(p + offset1), fbm(rot01 * p + offset1));
  r = vec2(fbm(rot1 * q + offset0), fbm(q + offset0));
  return fbm(p + r);
}

float digit(vec2 p){
    vec2 grid = uGridMul * 15.0;
    vec2 s = floor(p * grid) / grid;
    p = p * grid;
    vec2 q, r;
    float intensity = pattern(s * 0.1, q, r) * 1.3 - 0.03;
    
    if(uUseMouse > 0.5){
        vec2 mouseWorld = (uGatherProgress > 0.001) ? mouseSamplingPos : (uMouse * uScale);
        float distToMouse = distance(s, mouseWorld);
        float mouseInfluence = exp(-distToMouse * 8.0) * uMouseStrength * 10.0;
        intensity += mouseInfluence;
        
        float ripple = sin(distToMouse * 20.0 - iTime * 5.0) * 0.1 * mouseInfluence;
        intensity += ripple;
    }
    
    if(uUsePageLoadAnimation > 0.5){
        float cellRandom = fract(sin(dot(s, vec2(12.9898, 78.233))) * 43758.5453);
        float cellDelay = cellRandom * 0.8;
        float cellProgress = clamp((uPageLoadProgress - cellDelay) / 0.2, 0.0, 1.0);
        
        float fadeAlpha = smoothstep(0.0, 1.0, cellProgress);
        intensity *= fadeAlpha;
    }
    
    p = fract(p);
    p *= uDigitSize;
    
    float px5 = p.x * 5.0;
    float py5 = (1.0 - p.y) * 5.0;
    float x = fract(px5);
    float y = fract(py5);
    
    float i = floor(py5) - 2.0;
    float j = floor(px5) - 2.0;
    float n = i * i + j * j;
    float f = n * 0.0625;
    
    float isOn = step(0.1, intensity - f);
    float brightness = isOn * (0.2 + y * 0.8) * (0.75 + x * 0.25);
    
    return step(0.0, p.x) * step(p.x, 1.0) * step(0.0, p.y) * step(p.y, 1.0) * brightness;
}

float onOff(float a, float b, float c)
{
  return step(c, sin(iTime + a * cos(iTime * b))) * uFlickerAmount;
}

float displace(vec2 look)
{
    float y = look.y - mod(iTime * 0.25, 1.0);
    float window = 1.0 / (1.0 + 50.0 * y * y);
    return sin(look.y * 20.0 + iTime) * 0.0125 * onOff(4.0, 2.0, 0.8) * (1.0 + cos(iTime * 60.0)) * window;
}

vec3 getColor(vec2 p){
    
    float bar = step(mod(p.y + grainTime * 20.0, 1.0), 0.2) * 0.4 + 1.0;
    bar *= uScanlineIntensity;
    
    float displacement = displace(p);
    p.x += displacement;

    if (uGlitchAmount != 1.0) {
      float extra = displacement * (uGlitchAmount - 1.0);
      p.x += extra;
    }

    float middle = digit(p);
    
    const float off = 0.002;
    float sum = digit(p + vec2(-off, -off)) + digit(p + vec2(0.0, -off)) + digit(p + vec2(off, -off)) +
                digit(p + vec2(-off, 0.0)) + digit(p + vec2(0.0, 0.0)) + digit(p + vec2(off, 0.0)) +
                digit(p + vec2(-off, off)) + digit(p + vec2(0.0, off)) + digit(p + vec2(off, off));
    
    vec3 baseColor = vec3(0.9) * middle + sum * 0.1 * vec3(1.0) * bar;
    return baseColor;
}

vec2 barrel(vec2 uv){
  vec2 c = uv * 2.0 - 1.0;
  float r2 = dot(c, c);
  c *= 1.0 + uCurvature * r2;
  return c * 0.5 + 0.5;
}

void main() {
    time = iTime * 0.333333;
    grainTime = (uGatherProgress > 0.5) ? (iTime * 0.005) : time;
    vec2 uv = vUv;

    if(uCurvature != 0.0){
      uv = barrel(uv);
    }

    vec2 p = uv * uScale;
    vec2 gridVec = uGridMul * 15.0;

    if(uGatherProgress > 0.001){
      vec2 targetWorld = uTargetPos * uScale;
      float prog = clamp(uGatherProgress, 0.0, 0.9999) * 0.58;
      vec2 s = (p - targetWorld * prog) / (1.0 - prog);
      vec2 s_cell = floor(s * gridVec) / gridVec;
      vec2 s_new = s_cell + (targetWorld - s_cell) * prog;
      vec2 cellCenter = s_cell + 0.5 / gridVec;
      p = cellCenter + (p - s_new);
      mouseSamplingPos = uMouse * uScale;
      vec2 s_m = (mouseSamplingPos - targetWorld * prog) / (1.0 - prog);
      vec2 s_cell_m = floor(s_m * gridVec) / gridVec;
      vec2 s_new_m = s_cell_m + (targetWorld - s_cell_m) * prog;
      vec2 cellCenter_m = s_cell_m + 0.5 / gridVec;
      mouseSamplingPos = cellCenter_m + (mouseSamplingPos - s_new_m);
    } else {
      mouseSamplingPos = uMouse * uScale;
    }

    vec3 col = getColor(p);

    if(uChromaticAberration != 0.0){
      vec2 ca = vec2(uChromaticAberration) / iResolution.xy;
      col.r = getColor(p + ca).r;
      col.b = getColor(p - ca).b;
    }

    col *= uTint;
    col *= uBrightness;

    if(uDither > 0.0){
      float rnd = hash21(gl_FragCoord.xy);
      col += (rnd - 0.5) * (uDither * 0.003922);
    }

    gl_FragColor = vec4(col, 1.0);
}
`;

/* -----------------------------------------------------------------------------
   Helpers
   ----------------------------------------------------------------------------- */

/** Converts a hex colour (e.g. "#7FAF7A") to [r, g, b] in 0–1 for the shader. */
function hexToRgb(hex) {
  let h = hex.replace('#', '').trim();
  if (h.length === 3)
    h = h
      .split('')
      .map(c => c + c)
      .join('');
  const num = parseInt(h, 16);
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
}

/** Duration in ms for both zoom-in and zoom-back transitions (must match App.css header return duration). */
const GATHER_DURATION_MS = 1100;

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* -----------------------------------------------------------------------------
   Component
   ----------------------------------------------------------------------------- */

export default function FaultyTerminal({
  scale = 1,
  gridMul = [2, 1],
  digitSize = 1.5,
  timeScale = 0.3,
  pause = false,
  scanlineIntensity = 0.3,
  glitchAmount = 1,
  flickerAmount = 1,
  noiseAmp = 0,
  chromaticAberration = 0,
  dither = 0,
  curvature = 0.2,
  tint = '#ffffff',
  mouseReact = false,
  mouseStrength = 0.2,
  pageLoadAnimation = true,
  brightness = 1,
  transitionRequested = false,
  transitionTarget = null,
  onTransitionComplete,
  zoomBackRequested = false,
  onZoomBackComplete,
  className,
  style,
  ...rest
}) {
  /* Refs for WebGL and animation; we keep callback/request state in refs so the RAF loop always sees latest values without re-running the effect. */
  const containerRef = useRef(null);
  const programRef = useRef(null);
  const rendererRef = useRef(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const smoothMouseRef = useRef({ x: 0.5, y: 0.5 });
  const frozenTimeRef = useRef(0);
  const rafRef = useRef(0);
  const loadAnimationStartRef = useRef(0);
  const timeOffsetRef = useRef(Math.random() * 100);
  const transitionStartRef = useRef(0);
  const transitionRequestedRef = useRef(false);
  const transitionTargetRef = useRef(null);
  const zoomBackStartRef = useRef(-1);
  const zoomBackRequestedRef = useRef(false);
  const visibilityIntervalRef = useRef(null);
  const onTransitionCompleteRef = useRef(onTransitionComplete);
  const onZoomBackCompleteRef = useRef(onZoomBackComplete);
  onTransitionCompleteRef.current = onTransitionComplete;
  onZoomBackCompleteRef.current = onZoomBackComplete;
  transitionRequestedRef.current = transitionRequested;
  transitionTargetRef.current = transitionTarget;
  zoomBackRequestedRef.current = zoomBackRequested;

  const tintVec = useMemo(() => hexToRgb(tint), [tint]);
  const ditherValue = useMemo(() => (typeof dither === 'boolean' ? (dither ? 1 : 0) : dither), [dither]);

  /** Writes current mouse position (0–1, origin bottom-left) into mouseRef for the RAF loop. */
  const handleMouseMove = useCallback(e => {
    const x = e.clientX / window.innerWidth;
    const y = 1 - e.clientY / window.innerHeight;
    mouseRef.current = { x, y };
  }, []);

  useEffect(() => {
    const ctn = containerRef.current;
    if (!ctn) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const renderer = new Renderer({ dpr, antialias: false });
    rendererRef.current = renderer;
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 1);

    const geometry = new Triangle(gl);

    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height) },
        uScale: { value: scale },
        uGridMul: { value: new Float32Array(gridMul) },
        uDigitSize: { value: digitSize },
        uScanlineIntensity: { value: scanlineIntensity },
        uGlitchAmount: { value: glitchAmount },
        uFlickerAmount: { value: flickerAmount },
        uNoiseAmp: { value: noiseAmp },
        uChromaticAberration: { value: chromaticAberration },
        uDither: { value: ditherValue },
        uCurvature: { value: curvature },
        uTint: { value: new Color(tintVec[0], tintVec[1], tintVec[2]) },
        uMouse: { value: new Float32Array([smoothMouseRef.current.x, smoothMouseRef.current.y]) },
        uMouseStrength: { value: mouseStrength },
        uUseMouse: { value: mouseReact ? 1 : 0 },
        uPageLoadProgress: { value: pageLoadAnimation ? 0 : 1 },
        uUsePageLoadAnimation: { value: pageLoadAnimation ? 1 : 0 },
        uBrightness: { value: brightness },
        uGatherProgress: { value: 0 },
        uTargetPos: { value: new Float32Array([0.5, 0.5]) }
      }
    });
    programRef.current = program;

    const mesh = new Mesh(gl, { geometry, program });

    /* Render at 88% of window size, then set canvas display size to full window so we draw fewer pixels. */
    const RESOLUTION_SCALE = 0.88;
    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const rw = Math.ceil(w * RESOLUTION_SCALE);
      const rh = Math.ceil(h * RESOLUTION_SCALE);

      renderer.setSize(rw, rh);
      renderer.dpr = dpr;
      const canvas = gl.canvas;
      if (canvas.style) {
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
      }

      program.uniforms.iResolution.value.set(w, h, w / h);

      const referenceWidth = 1920;
      const referenceHeight = 1080;
      const scaleFactor = Math.min(w / referenceWidth, h / referenceHeight) * dpr;

      program.uniforms.uScale.value = scale * scaleFactor;
    };

    resize();
    let resizeTick = 0;
    const throttledResize = () => {
      const t = performance.now();
      if (t - resizeTick < 120) return;
      resizeTick = t;
      resize();
    };
    window.addEventListener('resize', throttledResize);

    /**
     * Main loop: updates time, page-load progress, mouse smoothing, zoom/zoom-back state, then renders.
     * When the tab is hidden we don't schedule the next RAF; the visibility interval calls update every 100ms instead.
     */
    const update = t => {
      rafRef.current = 0;
      if (typeof document !== 'undefined' && !document.hidden) {
        rafRef.current = requestAnimationFrame(update);
      }

      if (pageLoadAnimation && loadAnimationStartRef.current === 0) {
        loadAnimationStartRef.current = t;
      }

      if (!pause) {
        const elapsed = (t * 0.001 + timeOffsetRef.current) * timeScale;
        program.uniforms.iTime.value = elapsed;
        frozenTimeRef.current = elapsed;
      } else {
        program.uniforms.iTime.value = frozenTimeRef.current;
      }

      if (pageLoadAnimation && loadAnimationStartRef.current > 0) {
        const animationDuration = 2000;
        const animationElapsed = t - loadAnimationStartRef.current;
        const progress = Math.min(animationElapsed / animationDuration, 1);
        program.uniforms.uPageLoadProgress.value = progress;
      }

      if (mouseReact) {
        const dampingFactor = 0.08;
        const smoothMouse = smoothMouseRef.current;
        const mouse = mouseRef.current;
        smoothMouse.x += (mouse.x - smoothMouse.x) * dampingFactor;
        smoothMouse.y += (mouse.y - smoothMouse.y) * dampingFactor;

        const mouseUniform = program.uniforms.uMouse.value;
        mouseUniform[0] = smoothMouse.x;
        mouseUniform[1] = smoothMouse.y;
      }

      /* Zoom-back: uGatherProgress goes from 1 to 0 over GATHER_DURATION_MS; then we call onZoomBackComplete. */
      if (zoomBackRequestedRef.current && zoomBackStartRef.current >= 0) {
        const target = transitionTargetRef.current;
        if (target && target.x != null && target.y != null) {
          const tu = program.uniforms.uTargetPos.value;
          tu[0] = target.x;
          tu[1] = target.y;
        }
        if (zoomBackStartRef.current === 0) zoomBackStartRef.current = t;
        const elapsed = t - zoomBackStartRef.current;
        if (elapsed < GATHER_DURATION_MS) {
          const tNorm = elapsed / GATHER_DURATION_MS;
          program.uniforms.uGatherProgress.value = 1 - easeOutCubic(tNorm);
        } else {
          program.uniforms.uGatherProgress.value = 0;
          zoomBackStartRef.current = -1;
          onZoomBackCompleteRef.current?.();
        }
      } else if (transitionRequestedRef.current && transitionStartRef.current >= 0) {
        /* Zoom-in: uGatherProgress goes from 0 to 1; then we call onTransitionComplete. */
        const target = transitionTargetRef.current;
        if (target && target.x != null && target.y != null) {
          const tu = program.uniforms.uTargetPos.value;
          tu[0] = target.x;
          tu[1] = target.y;
        }
        if (transitionStartRef.current === 0) transitionStartRef.current = t;
        const elapsed = t - transitionStartRef.current;
        if (elapsed < GATHER_DURATION_MS) {
          const gatherT = elapsed / GATHER_DURATION_MS;
          program.uniforms.uGatherProgress.value = easeOutCubic(gatherT);
        } else {
          program.uniforms.uGatherProgress.value = 1;
          transitionStartRef.current = -1;
          onTransitionCompleteRef.current?.();
        }
      } else if (!transitionRequestedRef.current) {
        transitionStartRef.current = 0;
      }
      if (!zoomBackRequestedRef.current) {
        zoomBackStartRef.current = 0;
      }

      renderer.render({ scene: mesh });
    };

    /** When tab is hidden we switch to a 100ms interval instead of RAF to save CPU/GPU; when visible again we resume RAF. */
    const onVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
        if (!visibilityIntervalRef.current) {
          visibilityIntervalRef.current = setInterval(() => update(performance.now()), 100);
        }
      } else {
        if (visibilityIntervalRef.current) {
          clearInterval(visibilityIntervalRef.current);
          visibilityIntervalRef.current = null;
        }
        rafRef.current = requestAnimationFrame(update);
      }
    };

    rafRef.current = requestAnimationFrame(update);
    ctn.appendChild(gl.canvas);

    if (mouseReact) window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (visibilityIntervalRef.current) clearInterval(visibilityIntervalRef.current);
      window.removeEventListener('resize', throttledResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', onVisibilityChange);

      if (process.env.NODE_ENV === 'production') {
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    };
  }, [
    pause,
    timeScale,
    scale,
    gridMul,
    digitSize,
    scanlineIntensity,
    glitchAmount,
    flickerAmount,
    noiseAmp,
    chromaticAberration,
    ditherValue,
    curvature,
    tintVec,
    mouseReact,
    mouseStrength,
    pageLoadAnimation,
    brightness,
    handleMouseMove
  ]);

  return <div ref={containerRef} className={`faulty-terminal-container ${className}`} style={style} {...rest} />;
}
