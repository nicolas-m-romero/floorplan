// frontend/src/components/layout/Footer.tsx
// Marketing footer: Brand / Links / Legal columns.
import { Link } from 'react-router-dom';
import './Footer.css';

const GITHUB_URL = 'https://github.com/your-username/floorplan';

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner grid">
        <div className="footer__col footer__col--brand">
          <span className="footer__logo">FC</span>
          <p className="footer__tagline">Free, open-source floor plan tool.</p>
        </div>

        <div className="footer__col">
          <p className="footer__col-title">Links</p>
          <ul className="footer__links">
            <li><Link to="/login">Open App</Link></li>
            <li><a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub</a></li>
            <li>
              <a href={`${GITHUB_URL}/blob/main/CONTRIBUTING.md`} target="_blank" rel="noreferrer">
                Contribute
              </a>
            </li>
          </ul>
        </div>

        <div className="footer__col">
          <p className="footer__col-title">Legal</p>
          <ul className="footer__links">
            <li>
              <a href={`${GITHUB_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer">
                MIT License
              </a>
            </li>
          </ul>
        </div>
      </div>

      <p className="footer__copy">© {new Date().getFullYear()} FloorCraft contributors.</p>
    </footer>
  );
}
