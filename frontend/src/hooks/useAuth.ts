// frontend/src/hooks/useAuth.ts
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const { session, user, isLoading } = useAuthStore();

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { session, user, isLoading, isAuthenticated: !!session, signOut };
}
