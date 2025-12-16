import AuthForm from '@/components/auth/AuthForm';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    if (profile) {
      redirect(`/${profile.username}/podcasts`);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-foreground-bright mb-3">
          PodcastLB
        </h1>
        <p className="text-foreground max-w-md">
          Track, rate, and share your favorite podcasts. Add custom ratings,
          save favorite episodes, and discover what others are listening to.
        </p>
      </div>
      <AuthForm />
    </div>
  );
}
