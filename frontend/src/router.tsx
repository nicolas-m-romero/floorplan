// frontend/src/router.tsx
import { createBrowserRouter, redirect } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Editor } from './pages/Editor';

const DEV_MOCK = import.meta.env.VITE_DEV_MOCK === 'true';

async function requireAuth() {
  // Skip auth in dev mock mode so the editor is testable without Supabase credentials
  if (DEV_MOCK) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw redirect('/login');
  return null;
}

function NotFound() {
  return (
    <div style={{ padding: '4rem', textAlign: 'center', fontFamily: 'var(--font-body)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--type-display-lg)', color: 'var(--color-text-primary)' }}>
        404
      </h1>
      <p style={{ color: 'var(--color-text-secondary)', marginTop: '1rem' }}>
        Page not found.{' '}
        <a href="/" style={{ color: 'var(--color-accent)' }}>Go home →</a>
      </p>
    </div>
  );
}

function SharedView() {
  // Read-only shared layout view — loaded from share token in URL
  return (
    <div style={{ padding: '4rem', textAlign: 'center', fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)' }}>
      Shared view coming soon.
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Landing />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/dashboard',
    loader: requireAuth,
    element: <Dashboard />,
  },
  {
    path: '/editor/:projectId',
    loader: requireAuth,
    element: <Editor />,
  },
  {
    path: '/share/:token',
    element: <SharedView />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);
