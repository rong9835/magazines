'use client';

import { useRouter } from 'next/navigation';
import styles from './styles.module.css';

interface MagazineDetailProps {
  article: {
    id: number;
    title: string;
    date: string;
    category: string;
    categoryColor: string;
    imageUrl: string;
    summary: string;
    content: string[];
    tags: string[];
  };
}

export default function MagazineDetailComponent({
  article,
}: MagazineDetailProps) {
  const router = useRouter();

  return (
    <div className={styles.container}>
      {/* Back Button */}
      <button className={styles.backButton} onClick={() => router.push('/magazines')}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M11.25 13.5L6.75 9L11.25 4.5"
            stroke="#374151"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        목록으로
      </button>

      {/* Article Container */}
      <article className={styles.article}>
        {/* Hero Image with Overlay */}
        <div className={styles.heroContainer}>
          <div
            className={styles.heroImage}
            style={{ backgroundImage: `url(${article.imageUrl})` }}
          >
            <div className={styles.gradient} />
            <div
              className={styles.categoryBadge}
              style={{ backgroundColor: article.categoryColor }}
            >
              {article.category}
            </div>
          </div>
        </div>

        {/* Article Content */}
        <div className={styles.articleContent}>
          {/* Date */}
          <p className={styles.date}>{article.date}</p>

          {/* Title */}
          <h1 className={styles.title}>{article.title}</h1>

          {/* Summary */}
          <div className={styles.summaryContainer}>
            <p className={styles.summary}>{article.summary}</p>
          </div>

          {/* Content Paragraphs */}
          {article.content.map((paragraph, index) => (
            <p key={index} className={styles.paragraph}>
              {paragraph}
            </p>
          ))}

          {/* Tags */}
          <div className={styles.tagsContainer}>
            <div className={styles.tags}>
              {article.tags.map((tag, index) => (
                <div key={index} className={styles.tagBackground}>
                  <span className={styles.tag}>{tag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Back Button */}
        <button
          className={styles.bottomBackButton}
          onClick={() => router.push('/magazines')}
        >
          목록으로 돌아가기
        </button>
      </article>
    </div>
  );
}
