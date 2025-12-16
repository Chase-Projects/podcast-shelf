'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/ui/Header';
import PodcastSearch from '@/components/podcast/PodcastSearch';
import StarRating from '@/components/podcast/StarRating';
import CustomRatings from '@/components/podcast/CustomRatings';
import FavoriteEpisodes from '@/components/podcast/FavoriteEpisodes';
import { UserPodcast, Profile, CustomRating, FavoriteEpisode, Podcast } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Trash2, ExternalLink, ArrowUpDown, Star } from 'lucide-react';

type SortOption = 'recent' | 'name' | 'rating' | string;

export default function MyPodcastsPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [userPodcasts, setUserPodcasts] = useState<UserPodcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    // Get profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (!profileData) {
      router.push('/');
      return;
    }

    setProfile(profileData);

    // Check if current user is owner
    const { data: { user } } = await supabase.auth.getUser();
    setIsOwner(user?.id === profileData.id);

    // Get podcasts
    const { data: podcasts } = await supabase
      .from('user_podcasts')
      .select(`
        *,
        podcast:podcasts(*),
        custom_ratings(*),
        favorite_episodes(*)
      `)
      .eq('user_id', profileData.id)
      .order('updated_at', { ascending: false });

    setUserPodcasts(podcasts || []);

    // Extract unique custom rating categories
    const categories = new Set<string>();
    podcasts?.forEach(p => {
      if (p.custom_ratings && Array.isArray(p.custom_ratings)) {
        p.custom_ratings.forEach((cr: CustomRating) => categories.add(cr.category_name));
      }
    });
    setCustomCategories(Array.from(categories).sort());

    setLoading(false);
  }, [username, supabase, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sortedPodcasts = useMemo(() => {
    const sorted = [...userPodcasts];

    switch (sortBy) {
      case 'name':
        return sorted.sort((a, b) => {
          const titleA = (a.podcast as Podcast)?.title || '';
          const titleB = (b.podcast as Podcast)?.title || '';
          return titleA.localeCompare(titleB);
        });
      case 'rating':
        return sorted.sort((a, b) => (b.overall_rating || 0) - (a.overall_rating || 0));
      case 'recent':
        return sorted.sort((a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      default:
        // Sort by custom category rating
        if (sortBy.startsWith('custom:')) {
          const categoryName = sortBy.replace('custom:', '');
          return sorted.sort((a, b) => {
            const ratingA = (a.custom_ratings as CustomRating[])?.find(
              cr => cr.category_name === categoryName
            )?.rating || 0;
            const ratingB = (b.custom_ratings as CustomRating[])?.find(
              cr => cr.category_name === categoryName
            )?.rating || 0;
            return ratingB - ratingA;
          });
        }
        return sorted;
    }
  }, [userPodcasts, sortBy]);

  const handleRatingChange = async (userPodcastId: string, rating: number) => {
    await supabase
      .from('user_podcasts')
      .update({ overall_rating: rating })
      .eq('id', userPodcastId);

    loadData();
  };

  const handleReviewChange = async (userPodcastId: string, review: string) => {
    await supabase
      .from('user_podcasts')
      .update({ review_text: review })
      .eq('id', userPodcastId);
  };

  const handleFavoriteToggle = async (userPodcastId: string, currentValue: boolean) => {
    await supabase
      .from('user_podcasts')
      .update({ is_favorite: !currentValue })
      .eq('id', userPodcastId);

    loadData();
  };

  const handleDelete = async (userPodcastId: string) => {
    if (!confirm('Remove this podcast from your library?')) return;

    await supabase
      .from('user_podcasts')
      .delete()
      .eq('id', userPodcastId);

    loadData();
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground-bright">
              {isOwner ? 'My Podcasts' : `${profile?.display_name}'s Podcasts`}
            </h1>
            <Link
              href={`/${username}`}
              className="text-sm text-accent hover:text-accent-hover"
            >
              View profile
            </Link>
          </div>
        </div>

        {isOwner && (
          <div className="mb-8">
            <PodcastSearch onAdd={loadData} />
          </div>
        )}

        {/* Sort Controls */}
        {userPodcasts.length > 0 && (
          <div className="flex items-center gap-3 mb-4">
            <ArrowUpDown size={16} className="text-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm py-1.5 px-3 bg-background-secondary border border-border rounded"
            >
              <option value="recent">Recently Updated</option>
              <option value="name">Name (A-Z)</option>
              <option value="rating">Overall Rating</option>
              {customCategories.length > 0 && (
                <optgroup label="Custom Ratings">
                  {customCategories.map(cat => (
                    <option key={cat} value={`custom:${cat}`}>{cat}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        )}

        {userPodcasts.length === 0 ? (
          <div className="text-center py-16 bg-background-secondary rounded-lg">
            <p className="text-foreground mb-2">No podcasts yet</p>
            {isOwner && (
              <p className="text-sm text-foreground">
                Search above to add your first podcast
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {sortedPodcasts.map((up) => {
              const isExpanded = expandedId === up.id;
              const podcast = up.podcast as Podcast;

              return (
                <div
                  key={up.id}
                  className="bg-background-secondary rounded-lg overflow-hidden"
                >
                  {/* Collapsed view */}
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-background-tertiary transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : up.id)}
                  >
                    {podcast && (
                      <Image
                        src={podcast.artwork_url}
                        alt={podcast.title}
                        width={64}
                        height={64}
                        className="rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground-bright truncate">
                        {podcast?.title}
                      </h3>
                      <p className="text-sm text-foreground truncate">
                        {podcast?.author}
                      </p>
                      <div className="mt-1">
                        <StarRating rating={up.overall_rating} readonly size={14} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {podcast && (
                        <Link
                          href={`/podcast/${podcast.itunes_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 text-foreground hover:text-accent transition-colors"
                          title="View podcast page"
                        >
                          <ExternalLink size={18} />
                        </Link>
                      )}
                      {isExpanded ? (
                        <ChevronUp size={20} className="text-foreground" />
                      ) : (
                        <ChevronDown size={20} className="text-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded view */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-border">
                      <div className="grid md:grid-cols-2 gap-6 pt-4">
                        {/* Left column */}
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm text-foreground mb-2">
                              Overall Rating
                            </label>
                            <StarRating
                              rating={up.overall_rating}
                              onChange={isOwner ? (r) => handleRatingChange(up.id, r) : undefined}
                              readonly={!isOwner}
                              size={24}
                            />
                          </div>

                          <div>
                            <label className="block text-sm text-foreground mb-2">
                              Custom Ratings
                            </label>
                            <CustomRatings
                              userPodcastId={up.id}
                              ratings={(up.custom_ratings as CustomRating[]) || []}
                              readonly={!isOwner}
                              onUpdate={loadData}
                            />
                          </div>

                          {isOwner && (
                            <div>
                              <label className="block text-sm text-foreground mb-2">
                                Review
                              </label>
                              <textarea
                                defaultValue={up.review_text || ''}
                                onBlur={(e) => handleReviewChange(up.id, e.target.value)}
                                placeholder="Write your thoughts..."
                                className="w-full text-sm resize-none"
                                rows={3}
                              />
                            </div>
                          )}

                          {!isOwner && up.review_text && (
                            <div>
                              <label className="block text-sm text-foreground mb-2">
                                Review
                              </label>
                              <p className="text-sm text-foreground-bright">
                                {up.review_text}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Right column */}
                        <div>
                          <label className="block text-sm text-foreground mb-2">
                            Favorite Episodes
                          </label>
                          <FavoriteEpisodes
                            userPodcastId={up.id}
                            episodes={(up.favorite_episodes as FavoriteEpisode[]) || []}
                            readonly={!isOwner}
                            onUpdate={loadData}
                            podcastName={podcast?.title}
                            itunesId={podcast?.itunes_id}
                          />
                        </div>
                      </div>

                      {isOwner && (
                        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                          <button
                            onClick={() => handleFavoriteToggle(up.id, up.is_favorite)}
                            className={`flex items-center gap-1.5 text-sm transition-colors ${
                              up.is_favorite
                                ? 'text-accent'
                                : 'text-foreground hover:text-accent'
                            }`}
                          >
                            <Star size={16} fill={up.is_favorite ? 'currentColor' : 'none'} />
                            {up.is_favorite ? 'Favorited' : 'Add to Favorites'}
                          </button>
                          <button
                            onClick={() => handleDelete(up.id)}
                            className="flex items-center gap-1 text-sm text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 size={14} />
                            Remove from library
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
