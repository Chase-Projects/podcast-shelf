'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Loader2 } from 'lucide-react';
import { ITunesPodcast } from '@/types';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

interface PodcastSearchProps {
  onAdd?: () => void;
}

export default function PodcastSearch({ onAdd }: PodcastSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ITunesPodcast[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchPodcasts = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        setResults(data.results || []);
        setIsOpen(true);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchPodcasts, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleAdd = async (podcast: ITunesPodcast) => {
    setAddingId(podcast.collectionId);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First, check if podcast exists in our DB or create it
      let { data: existingPodcast } = await supabase
        .from('podcasts')
        .select('id')
        .eq('itunes_id', podcast.collectionId.toString())
        .single();

      let podcastId: string;

      if (!existingPodcast) {
        const { data: newPodcast, error: insertError } = await supabase
          .from('podcasts')
          .insert({
            itunes_id: podcast.collectionId.toString(),
            title: podcast.collectionName,
            author: podcast.artistName,
            artwork_url: podcast.artworkUrl600,
            feed_url: podcast.feedUrl || null,
            itunes_url: podcast.collectionViewUrl || null,
            artist_url: podcast.artistViewUrl || null,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;
        podcastId = newPodcast.id;
      } else {
        podcastId = existingPodcast.id;
      }

      // Check if user already has this podcast
      const { data: existing } = await supabase
        .from('user_podcasts')
        .select('id')
        .eq('user_id', user.id)
        .eq('podcast_id', podcastId)
        .single();

      if (existing) {
        // Already in library
        setAddingId(null);
        setQuery('');
        setIsOpen(false);
        return;
      }

      // Add to user's library
      const { error } = await supabase
        .from('user_podcasts')
        .insert({
          user_id: user.id,
          podcast_id: podcastId,
        });

      if (error) throw error;

      setQuery('');
      setIsOpen(false);
      onAdd?.();
    } catch (error) {
      console.error('Error adding podcast:', error);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground" size={18} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Search podcasts..."
          className="w-full pl-10 pr-4 py-2.5"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground animate-spin" size={18} />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background-secondary border border-border rounded-lg shadow-xl max-h-96 overflow-y-auto z-50">
          {results.map((podcast) => (
            <div
              key={podcast.collectionId}
              className="flex items-center gap-3 p-3 hover:bg-background-tertiary transition-colors"
            >
              <Image
                src={podcast.artworkUrl600}
                alt={podcast.collectionName}
                width={48}
                height={48}
                className="rounded"
              />
              <div className="flex-1 min-w-0">
                <p className="text-foreground-bright font-medium truncate">
                  {podcast.collectionName}
                </p>
                <p className="text-sm text-foreground truncate">
                  {podcast.artistName}
                </p>
              </div>
              <button
                onClick={() => handleAdd(podcast)}
                disabled={addingId === podcast.collectionId}
                className="p-2 text-accent hover:bg-accent/10 rounded-full transition-colors disabled:opacity-50"
              >
                {addingId === podcast.collectionId ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Plus size={20} />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
