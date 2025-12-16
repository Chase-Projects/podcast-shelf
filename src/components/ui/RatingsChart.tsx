'use client';

interface RatingsChartProps {
  ratings: (number | null)[];
  title?: string;
  height?: number;
}

export default function RatingsChart({ ratings, title, height = 120 }: RatingsChartProps) {
  // Filter out null ratings
  const validRatings = ratings.filter((r): r is number => r !== null);

  if (validRatings.length === 0) {
    return null;
  }

  // Calculate average
  const average = validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length;
  const totalCount = validRatings.length;

  // Count ratings by half-star level (0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5)
  const starLevels = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
  const distribution: { star: number; count: number; percentage: number }[] = starLevels.map(star => ({
    star,
    count: 0,
    percentage: 0,
  }));

  validRatings.forEach((rating) => {
    // Round to nearest 0.5
    const rounded = Math.round(rating * 2) / 2;
    const index = starLevels.indexOf(rounded);
    if (index !== -1) {
      distribution[index].count++;
    }
  });

  // Calculate percentages
  distribution.forEach(d => {
    d.percentage = totalCount > 0 ? (d.count / totalCount) * 100 : 0;
  });

  const maxCount = Math.max(...distribution.map(d => d.count), 1);

  // Format star display (show half stars with ½)
  const formatStar = (star: number) => {
    if (star % 1 === 0.5) {
      return `${Math.floor(star)}½`;
    }
    return star.toString();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Title and Average */}
      <div className="flex items-center justify-between mb-3">
        {title && (
          <h3 className="text-sm font-medium text-foreground-bright">{title}</h3>
        )}
        <div className="text-right">
          <span className="text-2xl font-bold text-accent">{average.toFixed(1)}</span>
          <span className="text-sm text-foreground ml-1">avg</span>
        </div>
      </div>

      {/* Vertical bar chart */}
      <div className="flex-1 flex items-end justify-between gap-1" style={{ minHeight: height }}>
        {distribution.map(({ star, count, percentage }) => {
          const barHeight = maxCount > 0 ? (count / maxCount) * 100 : 0;

          return (
            <div key={star} className="flex-1 flex flex-col items-center group relative">
              {/* Tooltip on hover */}
              <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="bg-background-tertiary border border-border rounded px-2 py-1 text-xs whitespace-nowrap shadow-lg">
                  <div className="text-foreground-bright font-medium">{formatStar(star)} stars</div>
                  <div className="text-foreground">{count} ({percentage.toFixed(0)}%)</div>
                </div>
              </div>

              {/* Bar */}
              <div
                className="w-full bg-background-tertiary rounded-t overflow-hidden flex flex-col justify-end"
                style={{ height: `${height}px` }}
              >
                <div
                  className="w-full bg-accent transition-all duration-300 rounded-t group-hover:bg-accent-hover"
                  style={{ height: `${barHeight}%` }}
                />
              </div>

              {/* Star label */}
              <div className="text-[10px] text-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {formatStar(star)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Total count */}
      <div className="text-xs text-foreground text-center mt-2">
        {totalCount} {totalCount === 1 ? 'rating' : 'ratings'}
      </div>
    </div>
  );
}
