// frontend/src/pages/Landing.tsx
// NOTE: The marketing landing page hero / Three.js animation is a separate agent's scope.
// This file provides the page shell so routing works. Stub sections are marked clearly.
import React from 'react';
import { useReveal } from '../hooks/useReveal';
import { Button } from '../components/ui/Button';
import { Eyebrow } from '../components/ui/Eyebrow';
import './Landing.css';

export function Landing() {
  useReveal();

  return (
    <div className="landing">
      {/* ── Nav ── */}
      <nav className="marketing-nav" aria-label="Main navigation">
        <a href="/" className="marketing-nav__logo" aria-label="FloorCraft home">
          FC
        </a>
        <ul className="marketing-nav__links">
          <li><a href="#what">Product</a></li>
          <li><a href="#how">How it works</a></li>
          <li>
            <a href="https://github.com/your-username/floorplan" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </li>
        </ul>
        <a href="/dashboard">
          <Button variant="secondary" size="sm">Open App →</Button>
        </a>
      </nav>

      {/* ── Hero ── */}
      <section className="hero" aria-label="Hero">
        <div className="hero__word hero__word--top">FLOOR</div>

        {/* Three.js hero canvas rendered by the hero agent */}
        <div
          className="hero__canvas"
          role="img"
          aria-label="Interactive 3D floor plan model"
          id="hero-canvas"
        />

        <div className="hero__word hero__word--bottom">CRAFT</div>

        <div className="hero__cta-group">
          <Eyebrow>Plan your space</Eyebrow>
          <p className="hero__descriptor">
            Upload a floor plan. Detect rooms. Place furniture. See how it fits.
          </p>
          <a href="/dashboard">
            <Button variant="primary" size="lg">Upload Floor Plan →</Button>
          </a>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <div className="stats-bar section--flush" aria-label="Product statistics">
        <div className="stats-bar__inner">
          {[
            { num: '6', label: 'Room types' },
            { num: '50+', label: 'Furniture items' },
            { num: '2', label: 'View modes' },
            { num: 'Free', label: 'Always' },
          ].map(({ num, label }) => (
            <div key={label} className="stat">
              <span className="stat__num">{num}</span>
              <span className="stat__label">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── What it does ── */}
      <section className="section grid" id="what" data-reveal>
        <div className="landing-what__left" style={{ gridColumn: '1 / 6' }}>
          <Eyebrow>The Tool</Eyebrow>
          <h2 className="landing-display-heading">
            Upload.<br />
            Detect.<br />
            Place.
          </h2>
        </div>
        <div className="landing-what__right" style={{ gridColumn: '7 / 13' }}>
          <p className="landing-body">
            FloorCraft turns a scanned floor plan into a precise 2D editing canvas. Our
            computer vision pipeline detects room boundaries automatically — then you
            place furniture from a catalog of real-world dimensions.
          </p>
          <p className="landing-body">
            Switch to 3D to check clearances, stacking, and how objects fill volume.
            Export a dimensioned PDF to share with movers or roommates.
          </p>
          <p className="landing-body">
            No subscription. No watermarks. MIT-licensed and self-hostable.
          </p>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="section grid" id="how" data-reveal>
        <div style={{ gridColumn: '1 / -1' }}>
          <Eyebrow>The Process</Eyebrow>
        </div>
        {[
          { n: '01', title: 'UPLOAD', desc: 'Drag a PNG, JPG, or PDF of your floor plan. Max 20MB.' },
          { n: '02', title: 'DETECT', desc: 'CV pipeline extracts room polygons. Correct any errors manually.' },
          { n: '03', title: 'PLACE', desc: 'Drag furniture from the catalog. Snap to walls. Toggle 3D.' },
        ].map((step) => (
          <div key={step.n} className="how-step card" style={{ gridColumn: 'span 4' }} data-reveal>
            <span className="how-step__num">{step.n}</span>
            <h3 className="how-step__title">{step.title}</h3>
            <p className="how-step__desc">{step.desc}</p>
          </div>
        ))}
      </section>

      {/* ── Feature callouts ── */}
      <section className="section grid" data-reveal>
        <div style={{ gridColumn: '1 / -1' }}>
          <Eyebrow>Built for real spaces</Eyebrow>
        </div>
        {[
          { title: '2D EDITOR', body: 'Precision placement with snap-to-wall and collision detection.' },
          { title: '3D VIEW', body: 'See how objects fill volume. Adjust height. Check clearances.' },
          { title: 'ROOM DETECTION', body: 'Computer vision extracts room geometry from your upload.' },
          { title: 'FURNITURE CATALOG', body: '50+ items with real-world dimensions in imperial and metric.' },
        ].map((feat) => (
          <div key={feat.title} className="card" style={{ gridColumn: 'span 3' }} data-reveal>
            <h3 className="card__title">{feat.title}</h3>
            <p className="card__body">{feat.body}</p>
          </div>
        ))}
      </section>

      {/* ── Open source callout ── */}
      <section className="open-source-callout section--flush" data-reveal>
        <p className="open-source-callout__eyebrow">
          <Eyebrow>Open Source</Eyebrow>
        </p>
        <h2 className="open-source-callout__heading">Free. Open source. Always.</h2>
        <div className="open-source-callout__actions">
          <a href="https://github.com/your-username/floorplan" target="_blank" rel="noreferrer">
            <Button variant="secondary">View on GitHub</Button>
          </a>
          <a href="/dashboard">
            <Button variant="primary">Try it now →</Button>
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer section--flush">
        <div className="footer__inner grid">
          <div style={{ gridColumn: 'span 4' }}>
            <span className="footer__logo">FC</span>
            <p className="footer__tagline">Free, open-source floor plan tool.</p>
          </div>
          <div style={{ gridColumn: 'span 4' }}>
            <p className="footer__col-title">Links</p>
            <ul className="footer__links">
              <li><a href="/dashboard">Open App</a></li>
              <li><a href="https://github.com/your-username/floorplan" target="_blank" rel="noreferrer">GitHub</a></li>
              <li><a href="https://github.com/your-username/floorplan/blob/main/CONTRIBUTING.md" target="_blank" rel="noreferrer">Contribute</a></li>
            </ul>
          </div>
          <div style={{ gridColumn: 'span 4' }}>
            <p className="footer__col-title">Legal</p>
            <ul className="footer__links">
              <li><a href="https://github.com/your-username/floorplan/blob/main/LICENSE" target="_blank" rel="noreferrer">MIT License</a></li>
            </ul>
          </div>
        </div>
        <p className="footer__copy">© {new Date().getFullYear()} FloorCraft contributors.</p>
      </footer>
    </div>
  );
}
