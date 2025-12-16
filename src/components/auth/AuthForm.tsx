'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // Get user profile for redirect
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .single();

          if (profile) {
            router.push(`/${profile.username}/podcasts`);
          }
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username.toLowerCase().replace(/[^a-z0-9]/g, ''),
              display_name: username,
            },
          },
        });
        if (error) throw error;

        // Redirect after signup
        router.push(`/${username.toLowerCase().replace(/[^a-z0-9]/g, '')}/podcasts`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="flex gap-4 mb-6">
        <button
          type="button"
          onClick={() => setIsLogin(true)}
          className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
            isLogin
              ? 'border-accent text-foreground-bright'
              : 'border-transparent text-foreground hover:text-foreground-bright'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setIsLogin(false)}
          className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
            !isLogin
              ? 'border-accent text-foreground-bright'
              : 'border-transparent text-foreground hover:text-foreground-bright'
          }`}
        >
          Create Account
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div>
            <label htmlFor="username" className="block text-sm text-foreground mb-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required={!isLogin}
              className="w-full"
              placeholder="yourname"
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm text-foreground mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm text-foreground mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-accent hover:bg-accent-hover text-background font-medium rounded transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Account'}
        </button>
      </form>
    </div>
  );
}
