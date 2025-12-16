import { ITunesSearchResult } from '@/types';

export async function searchPodcasts(term: string): Promise<ITunesSearchResult> {
  const params = new URLSearchParams({
    term,
    media: 'podcast',
    entity: 'podcast',
    limit: '20',
  });

  const response = await fetch(
    `https://itunes.apple.com/search?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error('Failed to search podcasts');
  }

  return response.json();
}
