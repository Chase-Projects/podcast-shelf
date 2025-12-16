'use client';

import Image from 'next/image';
import Link from 'next/link';
import { UserPodcast } from '@/types';
import StarRating from './StarRating';

interface PodcastCardProps {
  userPodcast: UserPodcast;
  showUser?: boolean;
}

export default function PodcastCard({ userPodcast, showUser = false }: PodcastCardProps) {
  const { podcast, overall_rating, profile } = userPodcast;

  if (!podcast) return null;

  return (
    <Link
      href={`/podcast/${podcast.itunes_id}`}
      className="group block"
    >
      <div className="relative aspect-square rounded-lg overflow-hidden bg-background-secondary">
        <Image
          src={podcast.artwork_url}
          alt={podcast.title}
          fill
          className="object-cover transition-transform group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
          {overall_rating && (
            <StarRating rating={overall_rating} readonly size={16} />
          )}
        </div>
      </div>
      <div className="mt-2">
        <h3 className="text-sm font-medium text-foreground-bright truncate group-hover:text-accent transition-colors">
          {podcast.title}
        </h3>
        {showUser && profile ? (
          <p className="text-xs text-foreground truncate">
            reviewed by {profile.display_name || profile.username}
          </p>
        ) : (
          <p className="text-xs text-foreground truncate">
            {podcast.author}
          </p>
        )}
      </div>
    </Link>
  );
}
