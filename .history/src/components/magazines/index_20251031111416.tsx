'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useMagazines } from '@/app/magazines/index.binding.hook';
import styles from './styles.module.css';

// Category color mapping
const categoryColors: Record<string, string> = {
  인공지능: '#8b5cf6',
  웹개발: '#22c55e',
  클라우드: '#3b82f6',
  보안: '#ef4444',
  모바일: '#ec4899',
  데이터사이언스: '#f59e0b',
  블록체인: '#14b8a6',
  DevOps: '#6366f1',
};

export default function MagazinesComponent() {
  const router = useRouter();
  const { magazines, loading, error } = useMagazines();

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>IT 매거진</h1>
            <p className={styles.subtitle}>
              최신 기술 트렌드와 인사이트를 전합니다
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem' }}>로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>IT 매거진</h1>
            <p className={styles.subtitle}>
              최신 기술 트렌드와 인사이트를 전합니다
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>
          에러 발생: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>IT 매거진</h1>
          <p className={styles.subtitle}>
            최신 기술 트렌드와 인사이트를 전합니다
          </p>
        </div>
        <div className={styles.headerButtons}>
          <button
            className={styles.loginButton}
            onClick={() => router.push('/auth/login')}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M9 1.5C9.41421 1.5 9.75 1.83579 9.75 2.25V7.5H14.25C14.6642 7.5 15 7.83579 15 8.25C15 8.66421 14.6642 9 14.25 9H9.75V14.25C9.75 14.6642 9.41421 15 9 15C8.58579 15 8.25 14.6642 8.25 14.25V9H3.75C3.33579 9 3 8.66421 3 8.25C3 7.83579 3.33579 7.5 3.75 7.5H8.25V2.25C8.25 1.83579 8.58579 1.5 9 1.5Z"
                fill="#6b7280"
              />
            </svg>
            로그인
          </button>
          <button
            className={styles.writeButton}
            onClick={() => router.push('/magazines/new')}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M9 1.5C9.41421 1.5 9.75 1.83579 9.75 2.25V7.5H14.25C14.6642 7.5 15 7.83579 15 8.25C15 8.66421 14.6642 9 14.25 9H9.75V14.25C9.75 14.6642 9.41421 15 9 15C8.58579 15 8.25 14.6642 8.25 14.25V9H3.75C3.33579 9 3 8.66421 3 8.25C3 7.83579 3.33579 7.5 3.75 7.5H8.25V2.25C8.25 1.83579 8.58579 1.5 9 1.5Z"
                fill="white"
              />
            </svg>
            글쓰기
          </button>
          <button
            className={styles.subscribeButton}
            onClick={() => router.push('/payments')}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M9 1.5C9.41421 1.5 9.75 1.83579 9.75 2.25V7.5H14.25C14.6642 7.5 15 7.83579 15 8.25C15 8.66421 14.6642 9 14.25 9H9.75V14.25C9.75 14.6642 9.41421 15 9 15C8.58579 15 8.25 14.6642 8.25 14.25V9H3.75C3.33579 9 3 8.66421 3 8.25C3 7.83579 3.33579 7.5 3.75 7.5H8.25V2.25C8.25 1.83579 8.58579 1.5 9 1.5Z"
                fill="white"
              />
            </svg>
            구독하기
          </button>
        </div>
      </div>

      {/* Articles Grid */}
      <div className={styles.articlesGrid}>
        {magazines.map((magazine) => (
          <article
            key={magazine.id}
            className={styles.articleCard}
            onClick={() => router.push(`/magazines/${magazine.id}`)}
          >
            <div className={styles.imageContainer}>
              {magazine.thumbnail_url ? (
                <img
                  src={magazine.thumbnail_url}
                  alt={magazine.title}
                  className={styles.image}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className={styles.imagePlaceholder} />
              )}
              <div
                className={styles.categoryBadge}
                style={{
                  backgroundColor:
                    categoryColors[magazine.category] || '#6b7280',
                }}
              >
                {magazine.category}
              </div>
            </div>
            <div className={styles.content}>
              <h2 className={styles.articleTitle}>{magazine.title}</h2>
              <p className={styles.articleDescription}>
                {magazine.description}
              </p>
              {magazine.tags && magazine.tags.length > 0 && (
                <div className={styles.tags}>
                  {magazine.tags.map((tag, index) => (
                    <span key={index} className={styles.tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
