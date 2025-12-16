import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const params = new URLSearchParams({
    term: query,
    media: 'podcast',
    entity: 'podcast',
    limit: '20',
  });

  try {
    const response = await fetch(
      `https://itunes.apple.com/search?${params.toString()}`,
      { next: { revalidate: 300 } } // Cache for 5 minutes
    );

    if (!response.ok) {
      throw new Error('iTunes API error');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to search podcasts', results: [] },
      { status: 500 }
    );
  }
}
