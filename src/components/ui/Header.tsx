'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { LogOut, User as UserIcon, Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Profile } from '@/types';

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(profile);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => setProfile(data));
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <header className="border-b border-border">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-foreground-bright hover:text-accent transition-colors">
          Podcast Shelf
        </Link>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 text-foreground hover:text-foreground-bright transition-colors rounded-full hover:bg-background-secondary"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {user && profile ? (
            <>
              <Link
                href={`/${profile.username}`}
                className="flex items-center gap-2 text-foreground hover:text-foreground-bright transition-colors"
              >
                <UserIcon size={18} />
                <span>{profile.display_name || profile.username}</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="text-foreground hover:text-foreground-bright transition-colors"
                title="Sign out"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <Link
              href="/"
              className="text-sm text-foreground hover:text-foreground-bright transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
