import React, { useEffect, useRef } from 'react';

const LEAF_ASSETS = [
  '/assets/farm/leaves/leaf-01.png',
  '/assets/farm/leaves/leaf-02.png',
  '/assets/farm/leaves/leaf-03.png',
  '/assets/farm/leaves/leaf-04.png',
  '/assets/farm/leaves/leaf-05.png',
  '/assets/farm/leaves/leaf-06.png',
  '/assets/farm/leaves/leaf-07.png'
];

export default function FloatingLeaf({ index = 0, reducedMotion = false }) {
  const leafRef = useRef(null);
  const asset = LEAF_ASSETS[index % LEAF_ASSETS.length];

  useEffect(() => {
    if (reducedMotion) return;

    let animId;
    let isDestroyed = false;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const leaf = {
      x: Math.random() * vw,
      y: -50 - Math.random() * 300,
      vx: 0.2 + Math.random() * 0.4,
      vy: 0.6 + Math.random() * 0.7,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 1.5,
      swayFreq: 0.8 + Math.random() * 0.8,
      swayAmp: 18 + Math.random() * 25,
      scale: 0.5 + Math.random() * 0.35,
      opacity: 0.4 + Math.random() * 0.4,
      timeOffset: Math.random() * 100
    };

    let lastTime = performance.now();

    const loop = (now) => {
      if (isDestroyed) return;
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const t = (now * 0.001) + leaf.timeOffset;
      const sway = Math.sin(t * leaf.swayFreq) * leaf.swayAmp;

      leaf.y += leaf.vy * 60 * dt;
      leaf.x += (leaf.vx + Math.cos(t * 0.5) * 0.3) * 60 * dt;
      leaf.rotation += leaf.rotSpeed;

      // Wrap around when falling below viewport
      if (leaf.y > window.innerHeight + 60) {
        leaf.y = -60;
        leaf.x = Math.random() * window.innerWidth;
      }
      if (leaf.x > window.innerWidth + 60) {
        leaf.x = -40;
      }

      if (leafRef.current) {
        leafRef.current.style.transform = `translate3d(${(leaf.x + sway).toFixed(1)}px, ${leaf.y.toFixed(1)}px, 0) rotate(${leaf.rotation.toFixed(1)}deg) scale(${leaf.scale.toFixed(2)})`;
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      isDestroyed = true;
      cancelAnimationFrame(animId);
    };
  }, [reducedMotion, index]);

  if (reducedMotion) return null;

  return (
    <div
      ref={leafRef}
      className="fixed top-0 left-0 pointer-events-none z-10 select-none will-change-transform"
      style={{ transform: 'translate3d(-100px, -100px, 0)' }}
      aria-hidden="true"
    >
      <img
        src={asset}
        alt=""
        className="w-8 sm:w-10 h-auto drop-shadow-sm opacity-60"
      />
    </div>
  );
}
