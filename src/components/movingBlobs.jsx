import { useEffect, useRef } from "react";
import "./movingBlobs.css";

/*
  Rewritten to use relative units (vw, vh, vmin) so the interactive blobs scale across screens.
  Approach summary:
   - blobsSeed contains the original numeric values (interpreted as pixels for initial layout).
   - Inside useEffect we convert those seed pixel values into relative viewport units:
       * x  -> vw-percent (0..100)
       * y  -> vh-percent (0..100)
       * size -> vmin-percent (so size scales consistently across aspect ratios)
       * speed -> vh-percent-per-frame (so upward motion preserves visual rate relative to viewport)
   - Cursor avoidance is computed in pixels (mouse events give pixels). Forces (px) are converted into vw/vh
     deltas before being applied so final CSS uses vw/vh and vmin exclusively.
   - pointer-events: none is set on each blob via inline style to keep them non-interactive.
   - Animation uses requestAnimationFrame and is cleaned up on unmount.
*/

export default function MovingBlobs() 
{
  // Refs to DOM elements so the animation loop can update style directly
  const blobsRef = useRef([]);
  // ref to hold animation frame id so we can cancel on unmount
  const rafRef = useRef(null);

  // Original seed values (interpreted as px when converting). The seed numbers are preserved
  // so we can base the relative conversions on them.
  const blobsSeed = 
  [
    { x: 100, y: 100, size: 150, speed: 0.12 },
    { x: 500, y: 400, size: 220, speed: 0.15 },
    { x: 200, y: 600, size: 300, speed: 0.2 },
    { x: 800, y: 300, size: 180, speed: 0.18 },
    { x: 1000, y: 500, size: 250, speed: 0.22 },
    { x: 600, y: 700, size: 200, speed: 0.17 },
    { x: 1200, y: 150, size: 280, speed: 0.2 },
    { x: 300, y: 800, size: 320, speed: 0.23 },
    { x: 900, y: 200, size: 180, speed: 0.15 },
    { x: 50, y: 600, size: 200, speed: 0.18 },
  ];

  useEffect(() => 
  {
    const blobs = blobsRef.current;

    // Mouse position tracked to make blobs avoid cursor
    const mouse = { x: null, y: null };

    // Update mouse coordinates on move (pixels)
    const handleMouseMove = (e) => 
    {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Convert seed values into viewport-relative units.
    // dataList stores: x (vw%), y (vh%), size (vmin%), speed (vh% per frame)
    const makeDataList = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const vmin = Math.min(w, h);

      return blobsSeed.map((s) => {
        return {
          // percent of viewport width (0..100)
          x: (s.x / w) * 100,
          // percent of viewport height (0..100)
          y: (s.y / h) * 100,
          // size as percent of vmin so width/height use vmin and scale consistently
          size: (s.size / vmin) * 100,
          // convert original pixel-based speed into vh-percent-per-frame so upward motion scales
          // (s.speed was originally a small pixel-like increment; convert by viewport height)
          speed: (s.speed / h) * 100,
        };
      });
    };

    // Working data used by animation loop
    let dataList = makeDataList();

    // Displacement in relative units: dx (vw-percent) and dy (vh-percent)
    const displacement = dataList.map(() => ({ dx: 0, dy: 0 }));

    // Recompute sizes/units on resize so blobs remain spread across the screen.
    const handleResize = () => {
      // recompute dataList but preserve current normalized positions and sizes proportionally.
      // We regenerate from seed so layout stays consistent relative to viewport.
      dataList = makeDataList();
      // reset displacements to avoid artifacts after large resize
      displacement.forEach((d) => { d.dx = 0; d.dy = 0; });
    };

    window.addEventListener("resize", handleResize);

    // Main animation loop
    const animate = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const vmin = Math.min(w, h);

      blobs.forEach((blob, idx) => 
      {
        if (!blob) return;
        const data = dataList[idx];

        // Move blob upward in vh-percent units by its speed (vh% per frame)
        data.y -= data.speed;

        // Calculate size in pixels (based on vmin) for accurate pixel collision checks and cursor math
        const sizePx = (data.size / 100) * vmin;
        const posXPx = (data.x / 100) * w;
        const posYPx = (data.y / 100) * h;

        // Wrap blob to bottom when it moves past the top (gives continuous spawn).
        // We use a pixel-based check to match the original behavior (use -50px threshold similar to before)
        if (posYPx + sizePx < -50) 
        {
          // Respawn just below the bottom of the viewport, randomized across width.
          // Keep using viewport-relative values for placement.
          const extraPx = Math.random() * 100; // up to 100px offset as before
          data.y = ((h + extraPx) / h) * 100; // convert px -> vh%
          data.x = (Math.random() * (w - sizePx) / w) * 100; // random vw% ensuring blob stays in bounds
          // Reset displacement to avoid sudden jump artifacts after respawn
          displacement[idx].dx = 0;
          displacement[idx].dy = 0;
        }

        // Calculate cursor avoidance:
        // We'll compute the cursor->blob vector in pixels, compute force in pixels (preserving safeDistance = 200px),
        // then convert that pixel force into vw/vh deltas to apply to displacement.
        let targetDXvw = 0; // target displacement in vw-percent
        let targetDYvh = 0; // target displacement in vh-percent
        if (mouse.x !== null && mouse.y !== null) 
        {
          // Blob center in pixels
          const centerX = posXPx + sizePx / 2;
          const centerY = posYPx + sizePx / 2;

          // Vector from cursor to blob center (pixels)
          const dx = centerX - mouse.x;
          const dy = centerY - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const safeDistance = 200; // preserved from original code (pixels)

          if (dist < safeDistance && dist > 0.0001) {
            // Force proportional to how close the cursor is (in pixels), same formula as original
            const forcePx = (safeDistance - dist) * 2.5;
            const angle = Math.atan2(dy, dx);
            const forceXpx = Math.cos(angle) * forcePx;
            const forceYpx = Math.sin(angle) * forcePx;

            // Convert pixel forces into viewport-percent deltas so we can add to data.x/data.y
            targetDXvw = (forceXpx / w) * 100;
            targetDYvh = (forceYpx / h) * 100;
          }
        }

        // Smoothly interpolate displacement towards the target to create spring/"slime" feel.
        const lerp = 0.05;
        displacement[idx].dx += (targetDXvw - displacement[idx].dx) * lerp;
        displacement[idx].dy += (targetDYvh - displacement[idx].dy) * lerp;

        // Final positions in relative units
        const finalXvw = data.x + displacement[idx].dx;
        const finalYvh = data.y + displacement[idx].dy;

        // Apply to DOM element with relative units (vw/vh for position, vmin for size).
        // Also ensure blobs themselves don't block pointer events.
        blob.style.left = `${finalXvw}vw`;
        blob.style.top = `${finalYvh}vh`;
        blob.style.width = `${data.size}vmin`;
        blob.style.height = `${data.size}vmin`;
        blob.style.pointerEvents = "none";
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    rafRef.current = requestAnimationFrame(animate);

    // Clean up on unmount: remove listeners and cancel animation frame
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []); // empty deps - run once on mount

  // Render blob elements; inline style sets initial positions using the seed converted values.
  // We still provide initial vw/vh/vmin values so layout is correct before animation starts.
  // Refs are assigned so the animation loop can mutate the DOM nodes.
  return (
    <div className="moving-blobs">
      {blobsSeed.map((blob, idx) => {
        // compute initial relative units for serverless initial render (approximate until effect runs)
        const w = typeof window !== "undefined" ? window.innerWidth : 1440;
        const h = typeof window !== "undefined" ? window.innerHeight : 900;
        const vmin = Math.min(w, h);
        const xvw = (blob.x / w) * 100;
        const yvh = (blob.y / h) * 100;
        const sizeVmin = (blob.size / vmin) * 100;

        return (
          <div
            key={idx}
            ref={(el) => (blobsRef.current[idx] = el)}
            className="blob"
            style={{
              top: `${yvh}vh`,
              left: `${xvw}vw`,
              width: `${sizeVmin}vmin`,
              height: `${sizeVmin}vmin`,
              pointerEvents: "none",
            }}
          ></div>
        );
      })}
    </div>
  );
}