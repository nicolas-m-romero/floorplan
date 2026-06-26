// frontend/src/pages/Login.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import './Login.css';

type Mode = 'signin' | 'signup';

export function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        setSuccessMsg('Check your email to confirm your account.');
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <a href="/" className="login-logo" aria-label="FloorCraft home">
          FC
        </a>

        <h1 className="login-title">
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </h1>

        {successMsg ? (
          <p className="login-success">{successMsg}</p>
        ) : (
          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              minLength={mode === 'signup' ? 8 : undefined}
              error={error ?? undefined}
            />

            <Button type="submit" variant="primary" isLoading={isLoading} style={{ width: '100%' }}>
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
          </form>
        )}

        <div className="login-divider">
          <span>or</span>
        </div>

        <Button
          variant="secondary"
          onClick={handleGoogle}
          style={{ width: '100%' }}
        >
          Continue with Google
        </Button>

        <p className="login-switch">
          {mode === 'signin' ? (
            <>
              No account?{' '}
              <button
                className="login-link"
                onClick={() => { setMode('signup'); setError(null); }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                className="login-link"
                onClick={() => { setMode('signin'); setError(null); }}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
