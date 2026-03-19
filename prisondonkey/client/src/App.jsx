import React, { useEffect, useRef } from 'react';
import './index.css';

export default function App() {
  const canvasRef = useRef(null);

  // Animated noise grain overlay on canvas
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
      if (frame % 3 !== 0) {
        animId = requestAnimationFrame(drawGrain);
        return;
      }
      const { width, height } = canvas;
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const v = Math.random() * 255;
        data[i]     = v;
        data[i + 1] = v;
        data[i + 2] = v;
        data[i + 3] = Math.random() * 18 + 4;
      }
      ctx.putImageData(imageData, 0, 0);
      animId = requestAnimationFrame(drawGrain);
    }
    drawGrain();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="pd-root">
      {/* Animated grain canvas */}
      <canvas ref={canvasRef} className="pd-grain" aria-hidden="true" />

      {/* Top bar */}
      <header className="pd-topbar">
        <div className="pd-topbar-inner">
          <span className="pd-topbar-tag">EST. 2026</span>
          <nav className="pd-topbar-nav">
            <a href="#about">About</a>
            <a href="#work">Work</a>
            <a href="#contact">Contact</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="pd-hero">
        <div className="pd-hero-bg-text" aria-hidden="true">PD</div>

        <div className="pd-hero-content">
          <div className="pd-eyebrow">
            <span className="pd-bars">&#9612;&#9612;&#9612;</span>
            <span>CREATIVE STUDIO</span>
            <span className="pd-bars">&#9612;&#9612;&#9612;</span>
          </div>

          <h1 className="pd-wordmark">
            <span className="pd-word-prison">prison</span>
            <span className="pd-word-donkey">Donkey</span>
          </h1>

          <p className="pd-tagline">
            Making things that matter<br />
            <em>from the inside out.</em>
          </p>

          <div className="pd-hero-cta">
            <a href="#work" className="pd-btn-primary">See the Work</a>
            <a href="#contact" className="pd-btn-ghost">Get in Touch</a>
          </div>
        </div>

        <div className="pd-hero-number" aria-hidden="true">001</div>
      </section>

      {/* Marquee band */}
      <div className="pd-marquee-wrap" aria-hidden="true">
        <div className="pd-marquee">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i}>PRISON DONKEY &nbsp;&bull;&nbsp; CREATIVE STUDIO &nbsp;&bull;&nbsp; EST. 2026 &nbsp;&bull;&nbsp; </span>
          ))}
        </div>
      </div>

      {/* About */}
      <section className="pd-section pd-about" id="about">
        <div className="pd-section-inner">
          <div className="pd-section-label">/ 01 &mdash; ABOUT</div>
          <div className="pd-about-grid">
            <div className="pd-about-left">
              <h2 className="pd-section-heading">
                Built in the<br />
                <span className="pd-accent">margins.</span>
              </h2>
            </div>
            <div className="pd-about-right">
              <p>Prison Donkey is a creative studio built on the belief that the most interesting work happens when you strip away the comfortable and start from nothing. No inherited audience. No safety net. Just the work.</p>
              <p>We build products, brands, and experiences that carry weight — because we know what it costs to make something real.</p>
              <div className="pd-stat-row">
                <div className="pd-stat">
                  <span className="pd-stat-num">100%</span>
                  <span className="pd-stat-label">Independent</span>
                </div>
                <div className="pd-stat">
                  <span className="pd-stat-num">0</span>
                  <span className="pd-stat-label">Compromises</span>
                </div>
                <div className="pd-stat">
                  <span className="pd-stat-num">&infin;</span>
                  <span className="pd-stat-label">Ideas</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Work */}
      <section className="pd-section pd-work" id="work">
        <div className="pd-section-inner">
          <div className="pd-section-label">/ 02 &mdash; WORK</div>
          <h2 className="pd-section-heading">Current<br /><span className="pd-accent">Projects.</span></h2>
          <div className="pd-work-grid">
            <div className="pd-work-card pd-work-card--featured">
              <div className="pd-work-card-num">001</div>
              <div className="pd-work-card-content">
                <h3>Something<br />Coming.</h3>
                <p>The first drop is in the works. Stay close.</p>
              </div>
              <div className="pd-work-card-tag">IN PROGRESS</div>
            </div>
            <div className="pd-work-card">
              <div className="pd-work-card-num">002</div>
              <div className="pd-work-card-content">
                <h3>TBA</h3>
                <p>Details to follow.</p>
              </div>
              <div className="pd-work-card-tag">SOON</div>
            </div>
            <div className="pd-work-card">
              <div className="pd-work-card-num">003</div>
              <div className="pd-work-card-content">
                <h3>TBA</h3>
                <p>Details to follow.</p>
              </div>
              <div className="pd-work-card-tag">SOON</div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="pd-section pd-contact" id="contact">
        <div className="pd-section-inner">
          <div className="pd-section-label">/ 03 &mdash; CONTACT</div>
          <div className="pd-contact-split">
            <h2 className="pd-contact-heading">
              Let's make<br />
              <span className="pd-accent">something.</span>
            </h2>
            <div className="pd-contact-right">
              <p className="pd-contact-sub">Ideas don't wait. Neither should you.</p>
              <a href="mailto:hello@prisondonkey.com" className="pd-contact-email">
                hello@prisondonkey.com
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="pd-footer">
        <div className="pd-footer-inner">
          <span className="pd-footer-mark">prisonDonkey &trade;</span>
          <span className="pd-footer-copy">&copy; 2026. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
