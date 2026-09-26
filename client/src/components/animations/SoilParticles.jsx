import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

const SOIL_SPRITES = [
  '/assets/farm/soil/soil-splash-01.png',
  '/assets/farm/soil/soil-splash-02.png',
  '/assets/farm/soil/soil-small.png',
  '/assets/farm/particles/particle-dust-01.png'
];

const SoilParticles = forwardRef(({ reducedMotion = false }, ref) => {
  const containerRef = useRef(null);
  const particlesRef = useRef([]);

  useImperativeHandle(ref, () => ({
    burst(x, y, count = 6) {
      if (reducedMotion || !containerRef.current) return;

      for (let i = 0; i < count; i++) {
        const particle = document.createElement('img');
        const sprite = SOIL_SPRITES[Math.floor(Math.random() * SOIL_SPRITES.length)];
        particle.src = sprite;
        particle.alt = '';
        particle.className = 'absolute pointer-events-none select-none will-change-transform';
        
        const size = 12 + Math.random() * 18;
        particle.style.width = `${size}px`;
        particle.style.height = 'auto';

        const angle = -Math.PI * 0.1 - Math.random() * Math.PI * 0.8; // arc upwards
        const speed = 2.5 + Math.random() * 3.5;
        const vx = Math.cos(angle) * speed;
        let vy = Math.sin(angle) * speed;
        let px = x + (Math.random() - 0.5) * 20;
        let py = y + 10;
        let opacity = 1;
        let rotation = Math.random() * 360;
        const rotSpeed = (Math.random() - 0.5) * 8;

        containerRef.current.appendChild(particle);

        const anim = () => {
          vy += 0.16; // gravity
          px += vx;
          py += vy;
          opacity -= 0.022;
          rotation += rotSpeed;

          particle.style.transform = `translate3d(${px}px, ${py}px, 0) rotate(${rotation}deg)`;
          particle.style.opacity = Math.max(0, opacity);

          if (opacity > 0) {
            requestAnimationFrame(anim);
          } else {
            if (particle.parentNode) {
              particle.parentNode.removeChild(particle);
            }
          }
        };

        requestAnimationFrame(anim);
      }
    }
  }));

  if (reducedMotion) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-20 overflow-hidden"
      aria-hidden="true"
    />
  );
});

export default SoilParticles;
