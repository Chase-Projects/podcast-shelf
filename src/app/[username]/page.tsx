import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Header from '@/components/ui/Header';
import PodcastCard from '@/components/podcast/PodcastCard';
import RatingsChart from '@/components/ui/RatingsChart';
import Link from 'next/link';
import { User, Library, Star } from 'lucide-react';
import { CustomRating, Podcast } from '@/types';
import Image from 'next/image';

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const supabase = await createClient();

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (!profile) {
    notFound();
  }

  // Get user's podcasts with ratings and custom ratings
  const { data: userPodcasts } = await supabase
    .from('user_podcasts')
    .select(`
      *,
      podcast:podcasts(*),
      custom_ratings(*)
    `)
    .eq('user_id', profile.id)
    .order('updated_at', { ascending: false });

  // Get current user to check if viewing own profile
  const { data: { user } } = await supabase.auth.getUser();
  const isOwnProfile = user?.id === profile.id;

  const ratedPodcasts = userPodcasts?.filter(p => p.overall_rating) || [];
  const unratedPodcasts = userPodcasts?.filter(p => !p.overall_rating) || [];
  const favoritePodcasts = userPodcasts?.filter(p => p.is_favorite) || [];

  // Extract ratings for the overall chart
  const overallRatings = userPodcasts?.map(p => p.overall_rating) || [];

  // Aggregate custom ratings by category
  const customRatingsMap = new Map<string, number[]>();
  userPodcasts?.forEach(up => {
    if (up.custom_ratings && Array.isArray(up.custom_ratings)) {
      up.custom_ratings.forEach((cr: CustomRating) => {
        const existing = customRatingsMap.get(cr.category_name) || [];
        existing.push(cr.rating);
        customRatingsMap.set(cr.category_name, existing);
      });
    }
  });

  // Convert to array and sort by count
  const customRatingsData = Array.from(customRatingsMap.entries())
    .map(([name, ratings]) => ({ name, ratings }))
    .sort((a, b) => b.ratings.length - a.ratings.length);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-20 h-20 rounded-full bg-background-secondary flex items-center justify-center">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name || profile.username}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User size={32} className="text-foreground" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground-bright">
              {profile.display_name || profile.username}
            </h1>
            <p className="text-foreground">@{profile.username}</p>
            <div className="flex gap-4 mt-2 text-sm text-foreground">
              <span>{userPodcasts?.length || 0} podcasts</span>
              <span>{ratedPodcasts.length} rated</span>
            </div>
          </div>
          {isOwnProfile && (
            <Link
              href={`/${username}/podcasts`}
              className="ml-auto px-4 py-2 bg-[#00e054] rounded font-medium hover:bg-[#00c44a] transition-colors flex items-center gap-2"
              style={{ color: '#14181c' }}
            >
              <Library size={18} style={{ color: '#14181c' }} />
              <span style={{ color: '#14181c' }}>Manage Library</span>
            </Link>
          )}
        </div>

        {/* Favorite Podcasts */}
        {favoritePodcasts.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Star size={20} className="text-accent" fill="currentColor" />
              <h2 className="text-lg font-semibold text-foreground-bright">
                Favorite Podcasts
              </h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {favoritePodcasts.map((up) => {
                const podcast = up.podcast as Podcast;
                return (
                  <Link
                    key={up.id}
                    href={`/podcast/${podcast?.itunes_id}`}
                    className="flex-shrink-0 group"
                  >
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden">
                      {podcast?.artwork_url && (
                        <Image
                          src={podcast.artwork_url}
                          alt={podcast.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      )}
                    </div>
                    <p className="text-xs text-foreground-bright mt-1 w-24 truncate text-center">
                      {podcast?.title}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Rating Charts Section */}
        {(ratedPodcasts.length > 0 || customRatingsData.length > 0) && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-foreground-bright mb-4">
              Rating Distributions
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Overall Ratings Chart */}
              {ratedPodcasts.length > 0 && (
                <div className="p-4 bg-background-secondary rounded-lg h-48">
                  <RatingsChart ratings={overallRatings} title="Overall" height={100} />
                </div>
              )}

              {/* Custom Rating Charts */}
              {customRatingsData.map(({ name, ratings }) => (
                <div key={name} className="p-4 bg-background-secondary rounded-lg h-48">
                  <RatingsChart ratings={ratings} title={name} height={100} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Rated Podcasts */}
        {ratedPodcasts.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-foreground-bright mb-4">
              Rated Podcasts
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {ratedPodcasts.map((up) => (
                <PodcastCard key={up.id} userPodcast={up} />
              ))}
            </div>
          </section>
        )}

        {/* Listening (Unrated) */}
        {unratedPodcasts.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground-bright mb-4">
              Listening
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {unratedPodcasts.map((up) => (
                <PodcastCard key={up.id} userPodcast={up} />
              ))}
            </div>
          </section>
        )}

        {(!userPodcasts || userPodcasts.length === 0) && (
          <div className="text-center py-16">
            <p className="text-foreground mb-4">No podcasts in library yet</p>
            {isOwnProfile && (
              <Link
                href={`/${username}/podcasts`}
                className="text-accent hover:text-accent-hover"
              >
                Add your first podcast
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
