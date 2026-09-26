import React, { useRef, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import CloudSky from '../originkit/ui/cloud-sky';
import FloatingLeaf from './FloatingLeaf';
import SoilParticles from './SoilParticles';

export default function FarmEnvironment() {
  const location = useLocation();
  const soilRef = useRef(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(motionQuery.matches);
    const handleMotion = (e) => setReducedMotion(e.matches);
    motionQuery.addEventListener('change', handleMotion);

    const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768;
    setIsMobile(touch);

    return () => motionQuery.removeEventListener('change', handleMotion);
  }, []);

  const path = location.pathname;

  // Page-specific environment density configuration
  const isAuthPage = path === '/login' || path === '/register';
  const isLanding = path === '/';
  const isWizard = path === '/farms/new';
  const isAiPage = path.startsWith('/ai');
  const isCropControl = path.includes('/crop-cycles/');
  const isDashboard = path === '/dashboard' || path === '/farms' || path === '/profile';

  // Environmental tuning per route
  let leafCount = 4;
  let showPollen = false;
  let showCloudSky = true;

  if (isLanding) {
    leafCount = 5;
    showPollen = true;
    showCloudSky = true;
  } else if (isAuthPage) {
    leafCount = 0;
    showPollen = false;
    showCloudSky = true;
  } else if (isWizard) {
    leafCount = 2;
    showPollen = false;
    showCloudSky = true;
  } else if (isAiPage) {
    leafCount = 2;
    showPollen = true;
    showCloudSky = true;
  } else if (isCropControl) {
    leafCount = 4;
    showPollen = true;
    showCloudSky = true;
  } else if (isDashboard) {
    leafCount = 3;
    showPollen = true;
    showCloudSky = true;
  }

  return (
    <>
      {/* ===================================================================
          LAYER 1: ORIGINKIT CLOUD SKY (Subtle Atmospheric Background)
          Constrained to upper ~38-44vh with smooth gradient mask fading out
          before reaching dashboard cards, forms, and main content.
          =================================================================== */}
      {showCloudSky && !reducedMotion && (
        <div
          className="fixed inset-x-0 top-0 pointer-events-none select-none z-0 overflow-hidden"
          style={{
            height: isMobile ? '32vh' : '44vh',
            opacity: isMobile ? 0.28 : (isAuthPage ? 0.25 : 0.38),
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0) 100%)',
            willChange: 'opacity'
          }}
          aria-hidden="true"
        >
          <CloudSky
            background="transparent"
            baseColor="#b8def7"
            accentColor="#ffffff"
            density={isMobile ? 40 : 55}
            speed={isMobile ? 12 : 18}
            size={105}
            clouds={{ softness: 115, shadow: 35, cirrus: 28 }}
            sun={{ x: 82, y: 16, glow: 'rgba(255, 250, 230, 0.32)' }}
            style={{ minWidth: 0, minHeight: 0, width: '100%', height: '100%' }}
          />
        </div>
      )}

      {/* ===================================================================
          LAYER 2: SUBTLE ENVIRONMENTAL PARTICLES & FLOATING LEAVES
          Kept non-intrusive and non-blocking (pointer-events: none)
          =================================================================== */}
      <div
        className="fixed inset-0 pointer-events-none z-20 overflow-hidden select-none"
        aria-hidden="true"
      >
        {/* Dynamic Soil Particles */}
        <SoilParticles ref={soilRef} reducedMotion={reducedMotion} />

        {/* Floating Wind Leaves */}
        {Array.from({ length: leafCount }).map((_, idx) => (
          <FloatingLeaf
            key={`leaf-${idx}`}
            index={idx}
            reducedMotion={reducedMotion}
          />
        ))}

        {/* Ambient Pollen / Dust Glow Particles */}
        {showPollen && !reducedMotion && (
          <div className="absolute top-1/4 right-1/4 pointer-events-none opacity-25 animate-pulse">
            <img
              src="/assets/farm/particles/pollen-glow.png"
              alt=""
              className="w-20 h-auto blur-sm"
              draggable={false}
            />
          </div>
        )}
      </div>
    </>
  );
}
