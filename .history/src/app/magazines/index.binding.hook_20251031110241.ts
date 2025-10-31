'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface Magazine {
  id: string;
  category: string;
  title: string;
  description: string;
  tags: string[] | null;
  image_url?: string;
  thumbnail_url?: string;
}

export function useMagazines() {
  const [magazines, setMagazines] = useState<Magazine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchMagazines() {
      try {
        setLoading(true);
        setError(null);

        // Fetch data from Supabase magazine table
        const { data, error: fetchError } = await supabase
          .from('magazine')
          .select('id, image_url, category, title, description, tags')
          .limit(10);

        if (fetchError) {
          throw fetchError;
        }

        // Transform image_url to thumbnail_url using Supabase Image Transformation
        const magazinesWithThumbnails = (data || []).map((magazine) => {
          let thumbnail_url = magazine.image_url;

          if (magazine.image_url) {
            let filePath = magazine.image_url;
            
            // Extract file path from image_url (could be full URL or just path)
            try {
              const url = new URL(magazine.image_url);
              // If it's a Supabase Storage URL, extract the file path
              const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
              if (pathMatch) {
                filePath = pathMatch[1];
              } else {
                // Not a storage URL, use as-is for getPublicUrl
                filePath = magazine.image_url;
              }
            } catch {
              // If not a valid URL, assume it's already a path
              filePath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
            }

            // Generate thumbnail URL using Supabase Storage getPublicUrl
            // Bucket name: vibe-coding-storage
            // Transform: width 323px, resize: contain
            const { data: publicUrlData } = supabase
              .storage
              .from('vibe-coding-storage')
              .getPublicUrl(filePath);
            
            // Add image transformation parameters to the URL
            const thumbnailUrl = new URL(publicUrlData.publicUrl);
            thumbnailUrl.searchParams.set('width', '323');
            thumbnailUrl.searchParams.set('resize', 'contain');
            thumbnail_url = thumbnailUrl.toString();
          }

          return {
            ...magazine,
            thumbnail_url
          };
        });

        setMagazines(magazinesWithThumbnails);
      } catch (err) {
        console.error('Error fetching magazines:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    }

    fetchMagazines();
  }, []);

  return { magazines, loading, error };
}
