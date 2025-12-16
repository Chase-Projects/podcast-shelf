'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, X, Loader2, Heart, ExternalLink, Search } from 'lucide-react';
import { FavoriteEpisode } from '@/types';
import { createClient } from '@/lib/supabase/client';

interface Episode {
  id: number;
  title: string;
  duration?: number;
  releaseDate?: string;
  description?: string;
  episodeUrl?: string;
}

interface FavoriteEpisodesProps {
  userPodcastId: string;
  episodes: FavoriteEpisode[];
  readonly?: boolean;
  onUpdate?: () => void;
  podcastName?: string;
  itunesId?: string;
}

export default function FavoriteEpisodes({
  userPodcastId,
  episodes,
  readonly = false,
  onUpdate,
  podcastName,
  itunesId,
}: FavoriteEpisodesProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Episode[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [title, setTitle] = useState('');
  const [episodeNumber, setEpisodeNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search episodes when query changes
  useEffect(() => {
    const searchEpisodes = async () => {
      if (!itunesId || searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setSearchLoading(true);
      try {
        const response = await fetch(`/api/episodes?podcastId=${itunesId}&q=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();
        setSearchResults(data.results || []);
        setIsSearchOpen(true);
      } catch (error) {
        console.error('Episode search error:', error);
      } finally {
        setSearchLoading(false);
      }
    };

    const debounce = setTimeout(searchEpisodes, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, itunesId]);

  const handleAddFromSearch = async (episode: Episode) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('favorite_episodes').insert({
        user_podcast_id: userPodcastId,
        episode_title: episode.title,
        episode_number: null,
        notes: null,
      });

      if (error) throw error;

      setSearchQuery('');
      setIsSearchOpen(false);
      setIsAdding(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error adding episode:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddManual = async () => {
    if (!title.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('favorite_episodes').insert({
        user_podcast_id: userPodcastId,
        episode_title: title.trim(),
        episode_number: episodeNumber.trim() || null,
        notes: notes.trim() || null,
      });

      if (error) throw error;

      setTitle('');
      setEpisodeNumber('');
      setNotes('');
      setIsAdding(false);
      setManualMode(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error adding episode:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('favorite_episodes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting episode:', error);
    }
  };

  // Generate iTunes search URL for an episode
  const getITunesSearchUrl = (episodeTitle: string) => {
    const searchQuery = podcastName
      ? `${podcastName} ${episodeTitle}`
      : episodeTitle;
    return `https://podcasts.apple.com/search?term=${encodeURIComponent(searchQuery)}`;
  };

  return (
    <div className="space-y-3">
      {episodes.length === 0 && readonly && (
        <p className="text-sm text-foreground italic">No favorite episodes yet</p>
      )}

      {episodes.map((episode) => (
        <div
          key={episode.id}
          className="flex items-start gap-3 p-3 bg-background-tertiary rounded-lg"
        >
          <Heart size={16} className="text-accent mt-0.5 flex-shrink-0" fill="currentColor" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground-bright font-medium">
              {episode.episode_number && (
                <span className="text-foreground mr-1">#{episode.episode_number}</span>
              )}
              {episode.episode_title}
            </p>
            {episode.notes && (
              <p className="text-xs text-foreground mt-1">{episode.notes}</p>
            )}
            <a
              href={getITunesSearchUrl(episode.episode_title)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover mt-1"
            >
              <ExternalLink size={10} />
              Find on Apple Podcasts
            </a>
          </div>
          {!readonly && (
            <button
              onClick={() => handleDelete(episode.id)}
              className="p-1 text-foreground hover:text-red-400 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ))}

      {!readonly && (
        <>
          {isAdding ? (
            <div className="space-y-3 p-3 bg-background-tertiary rounded-lg">
              {!manualMode && itunesId ? (
                <>
                  {/* Episode Search */}
                  <div ref={searchRef} className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground" size={14} />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => searchResults.length > 0 && setIsSearchOpen(true)}
                        placeholder="Search episodes..."
                        className="w-full pl-9 pr-4 py-2 text-sm"
                        autoFocus
                      />
                      {searchLoading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground animate-spin" size={14} />
                      )}
                    </div>

                    {isSearchOpen && searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-background-secondary border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto z-50">
                        {searchResults.map((episode) => (
                          <button
                            key={episode.id}
                            onClick={() => handleAddFromSearch(episode)}
                            disabled={loading}
                            className="w-full text-left px-3 py-2 hover:bg-background-tertiary transition-colors border-b border-border last:border-b-0"
                          >
                            <p className="text-sm text-foreground-bright truncate">
                              {episode.title}
                            </p>
                            {episode.releaseDate && (
                              <p className="text-xs text-foreground">
                                {new Date(episode.releaseDate).toLocaleDateString()}
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-foreground">Can&apos;t find it?</span>
                    <button
                      onClick={() => setManualMode(true)}
                      className="text-accent hover:text-accent-hover"
                    >
                      Add manually
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Manual Entry */}
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Episode title..."
                    className="w-full text-sm"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={episodeNumber}
                    onChange={(e) => setEpisodeNumber(e.target.value)}
                    placeholder="Episode number (optional)"
                    className="w-full text-sm"
                  />
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes (optional)"
                    className="w-full text-sm resize-none"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddManual}
                      disabled={loading || !title.trim()}
                      className="flex-1 py-1.5 bg-accent text-background text-sm rounded disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 size={14} className="animate-spin mx-auto" />
                      ) : (
                        'Add Episode'
                      )}
                    </button>
                    {itunesId && (
                      <button
                        onClick={() => setManualMode(false)}
                        className="px-3 py-1.5 text-foreground hover:text-foreground-bright text-sm"
                      >
                        Back to Search
                      </button>
                    )}
                  </div>
                </>
              )}

              <button
                onClick={() => {
                  setIsAdding(false);
                  setManualMode(false);
                  setSearchQuery('');
                  setTitle('');
                  setEpisodeNumber('');
                  setNotes('');
                }}
                className="w-full py-1.5 text-foreground hover:text-foreground-bright text-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1 text-sm text-accent hover:text-accent-hover transition-colors"
            >
              <Plus size={14} />
              Add favorite episode
            </button>
          )}
        </>
      )}
    </div>
  );
}
