'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Loader2, ChevronDown } from 'lucide-react';
import { CustomRating } from '@/types';
import StarRating from './StarRating';
import { createClient } from '@/lib/supabase/client';

interface CustomRatingsProps {
  userPodcastId: string;
  ratings: CustomRating[];
  readonly?: boolean;
  onUpdate?: () => void;
}

export default function CustomRatings({
  userPodcastId,
  ratings,
  readonly = false,
  onUpdate
}: CustomRatingsProps) {
  const [newCategory, setNewCategory] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previousCategories, setPreviousCategories] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const supabase = createClient();

  // Load previously used categories
  useEffect(() => {
    const loadPreviousCategories = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('custom_ratings')
        .select('category_name, user_podcast_id')
        .order('category_name');

      if (data) {
        // Get unique category names that aren't already used in this podcast
        const currentCategoryNames = ratings.map(r => r.category_name);
        const uniqueCategories = [...new Set(data.map(d => d.category_name))]
          .filter(cat => !currentCategoryNames.includes(cat));
        setPreviousCategories(uniqueCategories);
      }
    };

    if (!readonly) {
      loadPreviousCategories();
    }
  }, [supabase, readonly, ratings]);

  const handleAddCategory = async (categoryName?: string) => {
    const category = categoryName || newCategory.trim();
    if (!category) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('custom_ratings')
        .insert({
          user_podcast_id: userPodcastId,
          category_name: category,
          rating: 3,
        });

      if (error) throw error;

      setNewCategory('');
      setIsAdding(false);
      setShowSuggestions(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error adding category:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRatingChange = async (ratingId: string, newRating: number) => {
    try {
      const { error } = await supabase
        .from('custom_ratings')
        .update({ rating: newRating })
        .eq('id', ratingId);

      if (error) throw error;
      onUpdate?.();
    } catch (error) {
      console.error('Error updating rating:', error);
    }
  };

  const handleDelete = async (ratingId: string) => {
    try {
      const { error } = await supabase
        .from('custom_ratings')
        .delete()
        .eq('id', ratingId);

      if (error) throw error;
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting rating:', error);
    }
  };

  const filteredSuggestions = previousCategories.filter(cat =>
    cat.toLowerCase().includes(newCategory.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {ratings.map((rating) => (
        <div key={rating.id} className="flex items-center justify-between gap-4">
          <span className="text-sm text-foreground">{rating.category_name}</span>
          <div className="flex items-center gap-2">
            <StarRating
              rating={rating.rating}
              onChange={readonly ? undefined : (r) => handleRatingChange(rating.id, r)}
              readonly={readonly}
              size={16}
            />
            {!readonly && (
              <button
                onClick={() => handleDelete(rating.id)}
                className="p-1 text-foreground hover:text-red-400 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      ))}

      {!readonly && (
        <>
          {isAdding ? (
            <div className="relative">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => {
                      setNewCategory(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Category name..."
                    className="w-full text-sm py-1.5"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  />
                  {showSuggestions && filteredSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-background-secondary border border-border rounded shadow-lg z-10 max-h-32 overflow-y-auto">
                      {filteredSuggestions.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => handleAddCategory(cat)}
                          className="w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-background-tertiary hover:text-foreground-bright transition-colors"
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleAddCategory()}
                  disabled={loading || !newCategory.trim()}
                  className="p-1.5 bg-accent text-background rounded disabled:opacity-50"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                </button>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setNewCategory('');
                    setShowSuggestions(false);
                  }}
                  className="p-1.5 text-foreground hover:text-foreground-bright"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-1 text-sm text-accent hover:text-accent-hover transition-colors"
              >
                <Plus size={14} />
                Add custom rating
              </button>
              {previousCategories.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowSuggestions(!showSuggestions)}
                    className="flex items-center gap-1 text-sm text-foreground hover:text-foreground-bright transition-colors"
                  >
                    <ChevronDown size={14} />
                  </button>
                  {showSuggestions && (
                    <div className="absolute top-full right-0 mt-1 bg-background-secondary border border-border rounded shadow-lg z-10 min-w-40 max-h-32 overflow-y-auto">
                      {previousCategories.slice(0, 10).map((cat) => (
                        <button
                          key={cat}
                          onClick={() => handleAddCategory(cat)}
                          className="w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-background-tertiary hover:text-foreground-bright transition-colors"
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
