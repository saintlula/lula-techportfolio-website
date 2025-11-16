import { useEffect, useRef } from "react";
import "./movingBlobs.css";

export default function MovingBlobs() 
{
  // Refs to DOM elements for each blob so we can update styles directly
  const blobsRef = useRef([]);

  // Blob data: starting x/y position, rendered size in px, and vertical speed
  const blobsData = 
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

    // Update mouse coordinates on move
    const handleMouseMove = (e) => 
    {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Track displacement offsets for each blob (dx/dy) that are applied on top of its natural position.
    // This allows a "slimy" or springy response when blobs react to the cursor.
    const displacement = blobsData.map(() => ({ dx: 0, dy: 0 }));

    // Main animation loop that updates DOM positions each frame
    const animate = () => {
      blobs.forEach((blob, idx) => 
      {
        if (!blob) return;
        const data = blobsData[idx];

        // Move blob upward along its natural path by its speed value
        data.y -= data.speed;

        // Wrap blob to bottom when it moves past the top (gives continuous spawn)
        if (data.y + data.size < -50) 
        {
          data.y = window.innerHeight + Math.random() * 100;
          data.x = Math.random() * (window.innerWidth - data.size);
          // Reset displacement to avoid sudden jump artifacts after respawn
          displacement[idx].dx = 0;
          displacement[idx].dy = 0;
        }

        // Calculate cursor avoidance: if cursor is within a safe radius, push blob away
        let targetDX = 0;
        let targetDY = 0;
        if (mouse.x !== null && mouse.y !== null) 
        {
          // Vector from cursor to blob center
          const dx = data.x + data.size / 2 - mouse.x;
          const dy = data.y + data.size / 2 - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const safeDistance = 200;

          // If inside safeDistance, compute a force proportional to how close cursor is
          if (dist < safeDistance) {
            const force = (safeDistance - dist) * 2.5;
            const angle = Math.atan2(dy, dx);
            targetDX = Math.cos(angle) * force;
            targetDY = Math.sin(angle) * force;
          }
        }

        // Smoothly interpolate displacement towards the target to create a spring / "slime" effect
        const lerp = 0.05;
        displacement[idx].dx += (targetDX - displacement[idx].dx) * lerp;
        displacement[idx].dy += (targetDY - displacement[idx].dy) * lerp;

        // Final position = natural position + displacement offset
        const finalX = data.x + displacement[idx].dx;
        const finalY = data.y + displacement[idx].dy;

        // Apply to DOM element. Using style.left/top for simpler pixel-controlled movement.
        blob.style.left = `${finalX}px`;
        blob.style.top = `${finalY}px`;
      });

      // Schedule next frame
      requestAnimationFrame(animate);
    };

    // Start animation
    animate();

    // Clean up mouse listener on unmount
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Render blob elements; their inline style sets initial position/size.
  // Refs are assigned so the animation loop can mutate the DOM nodes.
  return (
    <div className="moving-blobs">
      {blobsData.map((blob, idx) => (
        <div
          key={idx}
          ref={(el) => (blobsRef.current[idx] = el)}
          className="blob"
          style={{
            top: `${blob.y}px`,
            left: `${blob.x}px`,
            width: `${blob.size}px`,
            height: `${blob.size}px`,
          }}
        ></div>
      ))}
    </div>
  );
}