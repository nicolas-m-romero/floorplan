// frontend/src/pages/Landing.tsx
// Marketing landing page — assembles the hero and all sections (Design System 9.1).
import { Link } from 'react-router-dom';
import { useReveal } from '../hooks/useReveal';
import { Button } from '../components/ui/Button';
import { Eyebrow } from '../components/ui/Eyebrow';
import { Badge } from '../components/ui/Badge';
import { MarketingNav } from '../components/layout/MarketingNav';
import { Footer } from '../components/layout/Footer';
import { Hero } from '../components/hero/Hero';
import './Landing.css';

const GITHUB_URL = 'https://github.com/your-username/floorplan';

const STATS = [
  { num: '6', label: 'Room types' },
  { num: '50+', label: 'Furniture items' },
  { num: '2', label: 'View modes' },
  { num: 'Free', label: 'Always' },
];

const STEPS = [
  { n: '01', title: 'UPLOAD', desc: 'Drag a PNG, JPG, or PDF of your floor plan. Max 20MB.' },
  { n: '02', title: 'DETECT', desc: 'Computer vision extracts room polygons. Correct any errors.' },
  { n: '03', title: 'PLACE', desc: 'Drag furniture from the catalog. Snap to walls. Toggle 3D.' },
];

const FEATURES = [
  { title: '2D EDITOR', body: 'Precision placement with snap-to-wall and collision detection.' },
  { title: '3D VIEW', body: 'See how objects fill volume. Adjust height. Check clearances.' },
  { title: 'ROOM DETECTION', body: 'Computer vision extracts room geometry straight from your upload.' },
  { title: 'FURNITURE CATALOG', body: '50+ items with real-world dimensions in imperial and metric.' },
];

export function Landing() {
  useReveal();

  return (
    <div className="landing">
      <MarketingNav />

      <Hero />

      {/* ── Stats bar ── */}
      <div className="stats-bar" aria-label="Product statistics">
        <div className="stats-bar__inner">
          {STATS.map(({ num, label }) => (
            <div key={label} className="stat">
              <span className="stat__num">{num}</span>
              <span className="stat__label">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── What it does ── */}
      <section className="section grid" id="what" data-reveal>
        <div className="what__left">
          <Eyebrow>The Tool</Eyebrow>
          <h2 className="display-heading">
            Upload.<br />
            Place.<br />
            See how it fits.
          </h2>
        </div>
        <div className="what__right">
          <p className="body-lead">
            FloorCraft turns a scanned floor plan into a precise 2D editing canvas. The
            computer vision pipeline detects room boundaries automatically — then you
            place furniture from a catalog of real-world dimensions.
          </p>
          <p className="body-lead">
            Switch to 3D to check clearances, stacking, and how objects fill volume.
            Export a dimensioned PDF to share with movers or roommates.
          </p>
          <p className="body-lead">
            No subscription. No watermarks. MIT-licensed and self-hostable.
          </p>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="section" id="how" data-reveal>
        <div className="section__head">
          <Eyebrow>The Process</Eyebrow>
        </div>
        <ol className="how-steps">
          {STEPS.map((step, i) => (
            <li key={step.n} className="how-step" data-reveal>
              <span className="how-step__num">{step.n}</span>
              <h3 className="how-step__title">{step.title}</h3>
              <p className="how-step__desc">{step.desc}</p>
              {i < STEPS.length - 1 && (
                <span className="how-step__connector" aria-hidden="true">→</span>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* ── Feature callouts (2×2) ── */}
      <section className="section" data-reveal>
        <div className="section__head">
          <Eyebrow>Built for real spaces</Eyebrow>
        </div>
        <div className="feature-grid">
          {FEATURES.map((feat) => (
            <div key={feat.title} className="card feature-card" data-reveal>
              <h3 className="feature-card__title">{feat.title}</h3>
              <p className="feature-card__body">{feat.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Editor preview ── */}
      <section className="editor-preview" data-reveal>
        <div className="editor-preview__frame">
          <div className="editor-preview__placeholder" role="img" aria-label="Screenshot of the Floorplan 2D editor">
            <span className="editor-preview__chrome">2D EDITOR</span>
          </div>
        </div>
        <p className="editor-preview__caption">
          The editor. No clutter. Just your floor plan and a tape measure.
        </p>
      </section>

      {/* ── Open source callout ── */}
      <section className="open-source-callout" data-reveal>
        <Eyebrow>Open Source</Eyebrow>
        <h2 className="open-source-callout__heading">Free. Open source. Always.</h2>
        <div className="open-source-callout__actions">
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">
            <Button variant="secondary">View on GitHub</Button>
          </a>
          <Link to="/login">
            <Button variant="primary">Try it now →</Button>
          </Link>
        </div>
        <Badge variant="muted">MIT License</Badge>
      </section>

      <Footer />
    </div>
  );
}
