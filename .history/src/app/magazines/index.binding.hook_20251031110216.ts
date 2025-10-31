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
            // Extract file path from image_url
            // image_url format could be full URL or just path
            let filePath = magazine.image_url;
            let baseUrl = '';
            
            // If it's a full URL, extract the path and base URL
            try {
              const url = new URL(magazine.image_url);
              baseUrl = `${url.protocol}//${url.host}`;
              
              // Extract path from URL (everything after bucket name in storage URL)
              const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
              if (pathMatch) {
                filePath = pathMatch[1];
                // Get base storage URL
                const bucketMatch = url.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)/);
                if (bucketMatch) {
                  const bucketName = bucketMatch[1];
                  baseUrl = `${baseUrl}/storage/v1/object/public/${bucketName}`;
                }
              } else {
                // If pattern doesn't match, use original URL
                baseUrl = '';
                filePath = magazine.image_url;
              }
            } catch {
              // If not a valid URL, assume it's already a path
              // Remove leading slash if present
              filePath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
            }

            // Generate thumbnail URL using Supabase Storage getPublicUrl with transform
            if (baseUrl) {
              // If we have a base URL, construct thumbnail URL with transform parameters
              thumbnail_url = `${baseUrl}/${filePath}?width=323&resize=contain`;
            } else {
              // If path only, use getPublicUrl and add transform parameters
              const { data: publicUrlData } = supabase
                .storage
                .from('vibe-coding-storage')
                .getPublicUrl(filePath);
              
              // Add transform parameters to the URL
              const url = new URL(publicUrlData.publicUrl);
              url.searchParams.set('width', '323');
              url.searchParams.set('resize', 'contain');
              thumbnail_url = url.toString();
            }
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
