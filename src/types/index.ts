export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Podcast {
  id: string;
  itunes_id: string;
  title: string;
  author: string;
  artwork_url: string;
  feed_url: string | null;
  itunes_url: string | null;
  artist_url: string | null;
  created_at: string;
}

export interface UserPodcast {
  id: string;
  user_id: string;
  podcast_id: string;
  overall_rating: number | null;
  review_text: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  podcast?: Podcast;
  custom_ratings?: CustomRating[];
  favorite_episodes?: FavoriteEpisode[];
  profile?: Profile;
}

export interface CustomRating {
  id: string;
  user_podcast_id: string;
  category_name: string;
  rating: number;
}

export interface FavoriteEpisode {
  id: string;
  user_podcast_id: string;
  episode_title: string;
  episode_number: string | null;
  notes: string | null;
  created_at: string;
}

export interface ITunesPodcast {
  collectionId: number;
  collectionName: string;
  artistName: string;
  artworkUrl600: string;
  feedUrl?: string;
  collectionViewUrl?: string;
  artistViewUrl?: string;
}

export interface ITunesSearchResult {
  resultCount: number;
  results: ITunesPodcast[];
}
