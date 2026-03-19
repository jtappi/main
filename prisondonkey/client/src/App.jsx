import React, { useEffect, useRef } from 'react';
import './index.css';
import logoUrl from './assets/logo.png';

export default function App() {
  const canvasRef = useRef(null);

  // Animated film-grain overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let frame = 0;

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function drawGrain() {
      frame++;
      if (frame % 3 !== 0) { animId = requestAnimationFrame(drawGrain); return; }
      const { width, height } = canvas;
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const v = Math.random() * 255;
        data[i] = data[i+1] = data[i+2] = v;
        data[i+3] = Math.random() * 18 + 4;
      }
      ctx.putImageData(imageData, 0, 0);
      animId = requestAnimationFrame(drawGrain);
    }
    drawGrain();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <div className="pd-root">
      <canvas ref={canvasRef} className="pd-grain" aria-hidden="true" />

      <div className="pd-page">
        {/* Left — wordmark column */}
        <div className="pd-left">
          <div className="pd-eyebrow" aria-hidden="true">
            <span className="pd-bars">&#9612;&#9612;&#9612;</span>
            <span>CREATIVE STUDIO</span>
            <span className="pd-bars">&#9612;&#9612;&#9612;</span>
          </div>

          <h1 className="pd-wordmark">
            <span className="pd-word-prison">PRISON</span>
            <span className="pd-word-donkey">DONKEY</span>
          </h1>

          <div className="pd-rule" aria-hidden="true" />

          <p className="pd-tagline">
            Making things that matter
            <br />
            <em>from the inside out.</em>
          </p>
        </div>

        {/* Right — logo image */}
        <div className="pd-right">
          <img
            src={logoUrl}
            alt="Prison Donkey — a donkey in an orange jumpsuit painting a self-portrait"
            className="pd-logo-img"
          />
        </div>
      </div>
    </div>
  );
}
