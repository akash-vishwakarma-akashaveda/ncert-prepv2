import { useState, useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';
import { Video, SearchResult } from '../types';

interface UseSearchOptions {
  threshold?: number;
  maxResults?: number;
}

export function useSearch(videos: Video[], options: UseSearchOptions = {}) {
  const [query, setQuery] = useState<string>('');
  const { threshold = 0.35, maxResults = 8 } = options;

  // Configure Fuse.js with weighted fields per FR-5 (video_title, chapter_name, subject)
  const fuse = useMemo(() => {
    return new Fuse(videos, {
      keys: [
        { name: 'video_title', weight: 0.5 },
        { name: 'chapter_name', weight: 0.3 },
        { name: 'subject', weight: 0.15 },
        { name: 'class_display', weight: 0.05 },
      ],
      threshold,
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 2,
    });
  }, [videos, threshold]);

  const results: SearchResult[] = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    const searchHits = fuse.search(trimmed, { limit: maxResults });
    return searchHits.map((hit) => ({
      item: hit.item,
      score: hit.score,
      matches: hit.matches?.map((m) => ({
        key: m.key || '',
        value: m.value || '',
        indices: m.indices,
      })),
    }));
  }, [query, fuse, maxResults]);

  const clearQuery = useCallback(() => {
    setQuery('');
  }, []);

  return {
    query,
    setQuery,
    clearQuery,
    results,
    isSearching: query.trim().length > 0,
    hasResults: results.length > 0,
  };
}
