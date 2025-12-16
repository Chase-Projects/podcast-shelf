import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const podcastId = searchParams.get('podcastId');
  const query = searchParams.get('q');

  if (!podcastId) {
    return NextResponse.json({ results: [] });
  }

  try {
    // First, get the podcast's feed URL from iTunes lookup
    const lookupResponse = await fetch(
      `https://itunes.apple.com/lookup?id=${podcastId}&entity=podcastEpisode&limit=50`,
      { next: { revalidate: 300 } }
    );

    if (!lookupResponse.ok) {
      throw new Error('iTunes API error');
    }

    const data = await lookupResponse.json();

    // First result is the podcast, rest are episodes
    const episodes = data.results.slice(1).map((ep: {
      trackId: number;
      trackName: string;
      trackTimeMillis?: number;
      releaseDate?: string;
      description?: string;
      episodeUrl?: string;
      trackViewUrl?: string;
    }) => ({
      id: ep.trackId,
      title: ep.trackName,
      duration: ep.trackTimeMillis,
      releaseDate: ep.releaseDate,
      description: ep.description,
      audioUrl: ep.episodeUrl,
      episodeUrl: ep.trackViewUrl,
    }));

    // Filter by query if provided
    let filteredEpisodes = episodes;
    if (query && query.length >= 2) {
      const lowerQuery = query.toLowerCase();
      filteredEpisodes = episodes.filter((ep: { title: string; description?: string }) =>
        ep.title.toLowerCase().includes(lowerQuery) ||
        (ep.description && ep.description.toLowerCase().includes(lowerQuery))
      );
    }

    return NextResponse.json({ results: filteredEpisodes });
  } catch (error) {
    console.error('Episode search error:', error);
    return NextResponse.json(
      { error: 'Failed to search episodes', results: [] },
      { status: 500 }
    );
  }
}
