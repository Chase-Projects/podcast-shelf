import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Header from '@/components/ui/Header';
import StarRating from '@/components/podcast/StarRating';
import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

interface PodcastPageProps {
  params: Promise<{ itunesId: string }>;
}

export default async function PodcastPage({ params }: PodcastPageProps) {
  const { itunesId } = await params;
  const supabase = await createClient();

  // Get podcast from our database
  const { data: podcast } = await supabase
    .from('podcasts')
    .select('*')
    .eq('itunes_id', itunesId)
    .single();

  if (!podcast) {
    notFound();
  }

  // Get all user reviews for this podcast
  const { data: reviews } = await supabase
    .from('user_podcasts')
    .select(`
      *,
      profile:profiles(*),
      custom_ratings(*),
      favorite_episodes(*)
    `)
    .eq('podcast_id', podcast.id)
    .order('updated_at', { ascending: false });

  // Calculate average rating
  const ratedReviews = reviews?.filter(r => r.overall_rating) || [];
  const avgRating = ratedReviews.length > 0
    ? ratedReviews.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / ratedReviews.length
    : null;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Podcast Header */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <Image
            src={podcast.artwork_url}
            alt={podcast.title}
            width={200}
            height={200}
            className="rounded-lg shadow-xl"
          />
          <div className="flex-1">
            {podcast.itunes_url ? (
              <a
                href={podcast.itunes_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2"
              >
                <h1 className="text-3xl font-bold text-foreground-bright group-hover:text-accent transition-colors">
                  {podcast.title}
                </h1>
                <ExternalLink size={20} className="text-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ) : (
              <h1 className="text-3xl font-bold text-foreground-bright mb-2">
                {podcast.title}
              </h1>
            )}

            {podcast.artist_url ? (
              <a
                href={podcast.artist_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1.5 mt-1 mb-4"
              >
                <p className="text-lg text-foreground group-hover:text-accent transition-colors">
                  {podcast.author}
                </p>
                <ExternalLink size={14} className="text-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ) : (
              <p className="text-lg text-foreground mb-4">{podcast.author}</p>
            )}

            <div className="flex items-center gap-4 text-sm text-foreground mt-4">
              <span>{reviews?.length || 0} reviews</span>
              {avgRating && (
                <div className="flex items-center gap-2">
                  <StarRating rating={Math.round(avgRating * 2) / 2} readonly size={16} />
                  <span>{avgRating.toFixed(1)} avg</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reviews */}
        <section>
          <h2 className="text-xl font-semibold text-foreground-bright mb-4">
            Reviews
          </h2>

          {!reviews || reviews.length === 0 ? (
            <div className="text-center py-12 bg-background-secondary rounded-lg">
              <p className="text-foreground">No reviews yet</p>
              <p className="text-sm text-foreground mt-1">
                Be the first to rate this podcast
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-background-secondary rounded-lg p-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Link
                          href={`/${review.profile?.username}`}
                          className="font-medium text-foreground-bright hover:text-accent transition-colors"
                        >
                          {review.profile?.display_name || review.profile?.username}
                        </Link>
                        {review.overall_rating && (
                          <StarRating rating={review.overall_rating} readonly size={14} />
                        )}
                      </div>

                      {review.review_text && (
                        <p className="text-foreground mb-3">{review.review_text}</p>
                      )}

                      {/* Custom ratings */}
                      {review.custom_ratings && review.custom_ratings.length > 0 && (
                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                          {review.custom_ratings.map((cr: { id: string; category_name: string; rating: number }) => (
                            <div key={cr.id} className="flex items-center gap-2">
                              <span className="text-foreground">{cr.category_name}:</span>
                              <StarRating rating={cr.rating} readonly size={12} />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Favorite episodes */}
                      {review.favorite_episodes && review.favorite_episodes.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-xs text-foreground mb-2">Favorite episodes:</p>
                          <div className="flex flex-wrap gap-2">
                            {review.favorite_episodes.map((ep: { id: string; episode_title: string; episode_number?: string }) => {
                              const searchUrl = `https://podcasts.apple.com/search?term=${encodeURIComponent(`${podcast.title} ${ep.episode_title}`)}`;
                              return (
                                <a
                                  key={ep.id}
                                  href={searchUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs bg-background-tertiary px-2 py-1 rounded text-foreground-bright hover:bg-accent hover:text-background transition-colors"
                                >
                                  {ep.episode_number && `#${ep.episode_number} `}
                                  {ep.episode_title}
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
