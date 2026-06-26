// frontend/src/components/layout/MarketingNav.tsx
// Transparent over the hero; gains a frosted backdrop once scrolled past 80px.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { ThemeToggle } from '../ui/ThemeToggle';
import './MarketingNav.css';

const GITHUB_URL = 'https://github.com/your-username/floorplan';

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`marketing-nav${scrolled ? ' is-scrolled' : ''}`}
      aria-label="Main navigation"
    >
      <Link to="/" className="marketing-nav__logo" aria-label="FloorCraft home">
        FC
      </Link>

      <ul className="marketing-nav__links">
        <li><a href="#what">Product</a></li>
        <li><a href="#how">How it works</a></li>
        <li>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub</a>
        </li>
      </ul>

      <div className="marketing-nav__actions">
        <ThemeToggle />
        <Link to="/login">
          <Button variant="secondary" size="sm">Open App →</Button>
        </Link>
      </div>
    </nav>
  );
}
