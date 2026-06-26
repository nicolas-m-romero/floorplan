// frontend/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { supabase } from './lib/supabase';
import { useAuthStore } from './stores/authStore';

// CSS load order: tokens → reset → base → utilities
import './styles/tokens.css';
import './styles/reset.css';
import './styles/base.css';
import './styles/utilities.css';

// Bootstrap auth state before first render
supabase.auth.getSession().then(({ data: { session } }) => {
  useAuthStore.getState().setSession(session);
  useAuthStore.getState().setLoading(false);
});

// Keep auth store in sync with Supabase session changes (refresh, sign-out, etc.)
supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.getState().setSession(session);
  useAuthStore.getState().setLoading(false);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
