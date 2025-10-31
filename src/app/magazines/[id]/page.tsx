'use client';

import MagazineDetailComponent from '@/components/magazines-detail';
import { useMagazineDetail } from './hooks/index.func.binding';

export default function MagazineDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const { magazine, loading, error } = useMagazineDetail(id);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
        <p>에러: {error}</p>
      </div>
    );
  }

  if (!magazine) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>매거진을 찾을 수 없습니다.</p>
      </div>
    );
  }

  // content 문자열을 배열로 변환 (줄바꿈 기준)
  const contentArray = magazine.content.split('\n').filter((p) => p.trim());

  // 컴포넌트가 기대하는 형태로 데이터 변환
  const article = {
    id: parseInt(magazine.id, 10),
    title: magazine.title,
    date: new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    category: magazine.category,
    categoryColor: '#8b5cf6', // 기본값
    imageUrl: magazine.image_url,
    summary: magazine.description,
    content: contentArray,
    tags: magazine.tags || [],
  };

  return <MagazineDetailComponent article={article} />;
}
