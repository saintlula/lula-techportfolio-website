/**
 * Shuffle.jsx — Character-by-character shuffle / scramble text animation
 *
 * Uses GSAP SplitText to split the text into characters, then animates each
 * character by sliding a strip of copies (original + scramble copies + real
 * char) so the "real" character appears to shuffle in. Can run once on scroll
 * (triggerOnce=true) or immediately and loop (triggerOnce=false, used for
 * ABOUT/RESUME/COVER labels and header).
 *
 * Flow:
 * - build(): SplitText splits into chars; for each char we wrap it in a
 *   container with an inner strip that holds [firstCopy, ...scramble copies, real].
 *   We set startX/finalX so sliding the strip reveals the real character.
 * - play(): GSAP timeline animates all strips' x from start to final; odd/even
 *   stagger or random delay. If loop, timeline repeats with repeatDelay.
 * - teardown(): Kill timeline, revert SplitText, restore DOM so we can rebuild
 *   when text or props change.
 *
 * When triggerOnce=false (main menu / header), we call create() immediately
 * (no ScrollTrigger) so the animation runs on mount and loops; we also arm
 * hover to re-run the shuffle on mouseenter.
 */

import React, { useRef, useEffect, useState, useMemo, memo } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText as GSAPSplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import './Shuffle.css';

gsap.registerPlugin(ScrollTrigger, GSAPSplitText, useGSAP);

const Shuffle = memo(function Shuffle({
  text,
  className = '',
  style = {},
  shuffleDirection = 'right',
  duration = 0.35,
  maxDelay = 0,
  ease = 'power3.out',
  threshold = 0.1,
  rootMargin = '-100px',
  tag = 'p',
  textAlign = 'center',
  onShuffleComplete,
  shuffleTimes = 1,
  animationMode = 'evenodd',
  loop = true,
  loopDelay = 1.0,
  stagger = 0.03,
  scrambleCharset = '',
  colorFrom,
  colorTo,
  triggerOnce = true,
  respectReducedMotion = true,
  triggerOnHover = true
}) {
  const ref = useRef(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [ready, setReady] = useState(false);

  const splitRef = useRef(null);
  const wrappersRef = useRef([]);
  const tlRef = useRef(null);
  const playingRef = useRef(false);
  const hoverHandlerRef = useRef(null);

  /** Wait for fonts so SplitText measures correctly (widths of chars). */
  useEffect(() => {
    if ('fonts' in document) {
      if (document.fonts.status === 'loaded') setFontsLoaded(true);
      else document.fonts.ready.then(() => setFontsLoaded(true));
    } else setFontsLoaded(true);
  }, []);

  /** ScrollTrigger "start" string (e.g. "top 90%") when triggerOnce is true. */
  const scrollTriggerStart = useMemo(() => {
    const startPct = (1 - threshold) * 100;
    const mm = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(rootMargin || '');
    const mv = mm ? parseFloat(mm[1]) : 0;
    const mu = mm ? mm[2] || 'px' : 'px';
    const sign = mv === 0 ? '' : mv < 0 ? `-=${Math.abs(mv)}${mu}` : `+=${mv}${mu}`;
    return `top ${startPct}%${sign}`;
  }, [threshold, rootMargin]);

  useGSAP(
    () => {
      if (!ref.current || !text || !fontsLoaded) return;
      if (respectReducedMotion && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setReady(true);
        onShuffleComplete?.();
        return;
      }

      const el = ref.current;
      const start = scrollTriggerStart;

      const removeHover = () => {
        if (hoverHandlerRef.current && ref.current) {
          ref.current.removeEventListener('mouseenter', hoverHandlerRef.current);
          hoverHandlerRef.current = null;
        }
      };

      /**
       * Teardown: kill timeline, restore DOM (replace each wrapper with the original char node), revert SplitText.
       * Called before rebuild or on cleanup so we don't leave extra nodes or GSAP instances.
       */
      const teardown = () => {
        if (tlRef.current) {
          tlRef.current.kill();
          tlRef.current = null;
        }
        if (wrappersRef.current.length) {
          wrappersRef.current.forEach(wrap => {
            const inner = wrap.firstElementChild;
            const orig = inner?.querySelector('[data-orig="1"]');
            if (orig && wrap.parentNode) wrap.parentNode.replaceChild(orig, wrap);
          });
          wrappersRef.current = [];
        }
        try {
          splitRef.current?.revert();
        } catch {
          /* noop */
        }
        splitRef.current = null;
        playingRef.current = false;
      };

      /**
       * Build: SplitText splits el into chars. For each char we create:
       * - A wrapper (overflow hidden, fixed width = char width).
       * - An inner strip (will-change: transform) containing: [firstCopy (original), ...scramble copies, real char].
       * We set strip x to startX so the real char is off-screen; animation moves to finalX to reveal it.
       * data-orig="1" marks the "real" char for teardown. data-start-x / data-final-x drive the tween.
       */
      const build = () => {
        teardown();

        splitRef.current = new GSAPSplitText(el, {
          type: 'chars',
          charsClass: 'shuffle-char',
          wordsClass: 'shuffle-word',
          linesClass: 'shuffle-line',
          smartWrap: true,
          reduceWhiteSpace: false
        });

        const chars = splitRef.current.chars || [];
        wrappersRef.current = [];

        const rolls = Math.max(1, Math.floor(shuffleTimes));
        const rand = set => set.charAt(Math.floor(Math.random() * set.length)) || '';

        chars.forEach(ch => {
          const parent = ch.parentElement;
          if (!parent) return;

          const w = ch.getBoundingClientRect().width;
          if (!w) return;

          const wrap = document.createElement('span');
          Object.assign(wrap.style, {
            display: 'inline-block',
            overflow: 'hidden',
            width: w + 'px',
            verticalAlign: 'baseline'
          });

          const inner = document.createElement('span');
          Object.assign(inner.style, {
            display: 'inline-block',
            whiteSpace: 'nowrap',
            willChange: 'transform'
          });

          parent.insertBefore(wrap, ch);
          wrap.appendChild(inner);

          const firstOrig = ch.cloneNode(true);
          Object.assign(firstOrig.style, { display: 'inline-block', width: w + 'px', textAlign: 'center' });

          ch.setAttribute('data-orig', '1');
          Object.assign(ch.style, { display: 'inline-block', width: w + 'px', textAlign: 'center' });

          inner.appendChild(firstOrig);
          for (let k = 0; k < rolls; k++) {
            const c = ch.cloneNode(true);
            if (scrambleCharset) c.textContent = rand(scrambleCharset);
            Object.assign(c.style, { display: 'inline-block', width: w + 'px', textAlign: 'center' });
            inner.appendChild(c);
          }
          inner.appendChild(ch);

          const steps = rolls + 1;
          let startX = 0;
          let finalX = -steps * w;
          if (shuffleDirection === 'right') {
            const firstCopy = inner.firstElementChild;
            const real = inner.lastElementChild;
            if (real) inner.insertBefore(real, inner.firstChild);
            if (firstCopy) inner.appendChild(firstCopy);
            startX = -steps * w;
            finalX = 0;
          }

          gsap.set(inner, { x: startX, force3D: true });
          if (colorFrom) inner.style.color = colorFrom;

          inner.setAttribute('data-final-x', String(finalX));
          inner.setAttribute('data-start-x', String(startX));

          wrappersRef.current.push(wrap);
        });
      };

      const inners = () => wrappersRef.current.map(w => w.firstElementChild);

      const randomizeScrambles = () => {
        if (!scrambleCharset) return;
        wrappersRef.current.forEach(w => {
          const strip = w.firstElementChild;
          if (!strip) return;
          const kids = Array.from(strip.children);
          for (let i = 1; i < kids.length - 1; i++) {
            kids[i].textContent = scrambleCharset.charAt(Math.floor(Math.random() * scrambleCharset.length));
          }
        });
      };

      /** When loop is false and animation completes: leave only the real char in each strip, remove will-change. */
      const cleanupToStill = () => {
        wrappersRef.current.forEach(w => {
          const strip = w.firstElementChild;
          if (!strip) return;
          const real = strip.querySelector('[data-orig="1"]');
          if (!real) return;
          strip.replaceChildren(real);
          strip.style.transform = 'none';
          strip.style.willChange = 'auto';
        });
      };

      /**
       * play(): Create a GSAP timeline that tweens each strip's x from start to final.
       * If animationMode === 'evenodd', odd and even strips run with a stagger; otherwise random delay per strip.
       * If loop, timeline repeats with repeatDelay. On complete (when !loop) we cleanup and arm hover.
       */
      const play = () => {
        const strips = inners();
        if (!strips.length) return;

        playingRef.current = true;

        const tl = gsap.timeline({
          smoothChildTiming: true,
          repeat: loop ? -1 : 0,
          repeatDelay: loop ? loopDelay : 0,
          onRepeat: () => {
            if (scrambleCharset) randomizeScrambles();
            gsap.set(strips, { x: (i, t) => parseFloat(t.getAttribute('data-start-x') || '0') });
            onShuffleComplete?.();
          },
          onComplete: () => {
            playingRef.current = false;
            if (!loop) {
              cleanupToStill();
              if (colorTo) gsap.set(strips, { color: colorTo });
              onShuffleComplete?.();
              armHover();
            }
          }
        });

        const addTween = (targets, at) => {
          tl.to(
            targets,
            {
              x: (i, t) => parseFloat(t.getAttribute('data-final-x') || '0'),
              duration,
              ease,
              force3D: true,
              stagger: animationMode === 'evenodd' ? stagger : 0
            },
            at
          );
          if (colorFrom && colorTo) {
            tl.to(targets, { color: colorTo, duration, ease }, at);
          }
        };

        if (animationMode === 'evenodd') {
          const odd = strips.filter((_, i) => i % 2 === 1);
          const even = strips.filter((_, i) => i % 2 === 0);
          const oddTotal = duration + Math.max(0, odd.length - 1) * stagger;
          const evenStart = odd.length ? oddTotal * 0.7 : 0;
          if (odd.length) addTween(odd, 0);
          if (even.length) addTween(even, evenStart);
        } else {
          strips.forEach(strip => {
            const d = Math.random() * maxDelay;
            tl.to(
              strip,
              {
                x: parseFloat(strip.getAttribute('data-final-x') || '0'),
                duration,
                ease,
                force3D: true
              },
              d
            );
            if (colorFrom && colorTo) tl.fromTo(strip, { color: colorFrom }, { color: colorTo, duration, ease }, d);
          });
        }

        tlRef.current = tl;
      };

      /** Add mouseenter listener to re-run build + play when user hovers (and we're not currently playing). */
      const armHover = () => {
        if (!triggerOnHover || !ref.current) return;
        removeHover();
        const handler = () => {
          if (playingRef.current) return;
          build();
          if (scrambleCharset) randomizeScrambles();
          play();
        };
        hoverHandlerRef.current = handler;
        ref.current.addEventListener('mouseenter', handler);
      };

      /** Full setup: build DOM, (optional) randomize scramble chars, play timeline, arm hover, set ready so text is visible. */
      const create = () => {
        build();
        if (scrambleCharset) randomizeScrambles();
        play();
        armHover();
        setReady(true);
      };

      if (!triggerOnce) {
        /* Main menu / header: no scroll trigger; run animation immediately so text (e.g. CLICK → RESUME) works. */
        create();
        return () => {
          removeHover();
          teardown();
          setReady(false);
        };
      }

      const st = ScrollTrigger.create({
        trigger: el,
        start,
        once: true,
        onEnter: create
      });

      return () => {
        st.kill();
        removeHover();
        teardown();
        setReady(false);
      };
    },
    {
      dependencies: [
        text,
        duration,
        maxDelay,
        ease,
        scrollTriggerStart,
        fontsLoaded,
        shuffleDirection,
        shuffleTimes,
        animationMode,
        loop,
        loopDelay,
        stagger,
        scrambleCharset,
        colorFrom,
        colorTo,
        triggerOnce,
        respectReducedMotion,
        triggerOnHover,
        onShuffleComplete
      ],
      scope: ref
    }
  );

  const commonStyle = useMemo(() => ({ textAlign, ...style }), [textAlign, style]);
  const classes = useMemo(() => `shuffle-parent ${ready ? 'is-ready' : ''} ${className}`, [ready, className]);

  const Tag = tag || 'p';
  return React.createElement(Tag, { ref, className: classes, style: commonStyle }, text);
});

export default Shuffle;
