'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Magazine {
  id: string;
  image_url: string;
  category: string;
  title: string;
  description: string;
  content: string;
  tags: string[] | null;
}

/**
 * image_url에서 경로를 추출하여 썸네일 URL 생성
 * Supabase Storage의 getPublicUrl을 사용하여 Image Transformation 적용
 * @param imageUrl - 전체 URL 또는 경로
 * @returns 썸네일 변환이 적용된 URL (width: 852px, resize: contain)
 */
const getThumbnailUrl = (imageUrl: string): string => {
  const bucketName = 'vibe-coding-storage';

  // image_url이 전체 URL인 경우 경로 추출
  // 예: https://xxx.supabase.co/storage/v1/object/public/vibe-coding-storage/path/to/image.jpg
  // 또는 단순히 경로만 있는 경우: path/to/image.jpg
  let filePath = imageUrl;

  // 전체 URL에서 경로 부분 추출
  const storagePattern = /\/storage\/v1\/object\/public\/[^/]+\/(.+)$/;
  const match = imageUrl.match(storagePattern);
  if (match) {
    filePath = match[1];
  } else {
    // 이미 경로만 있는 경우, 버킷명 접두사 제거 (있다면)
    filePath = filePath
      .replace(`/${bucketName}/`, '')
      .replace(`${bucketName}/`, '');
  }

  // Supabase Storage의 getPublicUrl을 사용하여 썸네일 URL 생성
  // transform 옵션: width 852px, resize contain, format: webp
  const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath, {
    transform: {
      width: 852,
      resize: 'contain' as const,
    },
  });

  // Add webp format to URL query parameters
  const thumbnailUrl = new URL(data.publicUrl);
  thumbnailUrl.searchParams.set('format', 'webp');
  return thumbnailUrl.toString();
};

export const useMagazineDetail = (id: string) => {
  const [magazine, setMagazine] = useState<Magazine | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMagazine = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('magazine')
          .select('id, image_url, category, title, description, content, tags')
          .eq('id', id)
          .single();

        if (fetchError) {
          throw fetchError;
        }

        // 조회된 image_url을 썸네일 URL로 변환
        if (data && data.image_url) {
          data.image_url = getThumbnailUrl(data.image_url);
        }

        setMagazine(data);
      } catch (err) {
        console.error('Error fetching magazine:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to fetch magazine'
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchMagazine();
    }
  }, [id]);

  return { magazine, loading, error };
};
