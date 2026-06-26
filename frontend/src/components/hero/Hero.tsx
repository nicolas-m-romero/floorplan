// frontend/src/components/hero/Hero.tsx
// Hero shell: the "FLOORCRAFT" wordmark sits above the 3D maquette, with the
// intro + CTA below.
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Eyebrow } from '../ui/Eyebrow';
import { HeroCanvas } from './HeroCanvas';
import './Hero.css';

export function Hero() {
  return (
    <section className="hero" aria-label="FloorCraft">
      {/* Accessible page heading; the giant word below is decorative. */}
      <h1 className="sr-only">FloorCraft — plan your space in 2D and 3D</h1>

      <span className="hero__word" aria-hidden="true">
        FLOORCRAFT
      </span>

      <HeroCanvas />

      <div className="hero__intro">
        <Eyebrow>Plan your space</Eyebrow>
        <p className="hero__descriptor">
          Upload a floor plan. Place your furniture. See how it fits.
        </p>
        <Link to="/login">
          <Button variant="primary" size="lg">
            Upload Floor Plan →
          </Button>
        </Link>
      </div>
    </section>
  );
}
