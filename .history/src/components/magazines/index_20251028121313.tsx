'use client';

import styles from './styles.module.css';

export default function MagazinesComponent() {
  const articles = [
    {
      id: 1,
      title: '2025년 AI 트렌드: 생성형 AI의 진화',
      description:
        'ChatGPT를 넘어서는 차세대 AI 기술과 산업\n전반의 변화를 살펴봅니다',
      tags: ['#생성형AI', '#멀티모달', '#ChatGPT', '#머신러닝'],
      category: '인공지능',
      categoryColor: '#8b5cf6',
    },
    {
      id: 2,
      title: 'React 19와 Next.js 15: 프론트엔드의 새로운 시대',
      description:
        '최신 프론트엔드 프레임워크의 혁신적인 기능과 개발자 경험 개선을 알아봅니다',
      tags: ['#React', '#Next.js', '#서버컴포넌트', '#프론트엔드'],
      category: '웹개발',
      categoryColor: '#22c55e',
    },
    {
      id: 3,
      title: '멀티클라우드 전략: 기업의 필수 선택',
      description:
        'AWS, Azure, GCP를 활용한 효율적인 클라우드 인프라 구축 방법',
      tags: ['#AWS', '#Azure', '#GCP', '#쿠버네티스'],
      category: '클라우드',
      categoryColor: '#3b82f6',
    },
    {
      id: 4,
      title: '제로 트러스트 보안: 더 이상 선택이 아닌 필수',
      description:
        '클라우드 시대의 새로운 보안 패러다임과 구현 전략을 소개합니다',
      tags: ['#제로트러스트', '#사이버보안', '#MFA', '#랜섬웨어'],
      category: '보안',
      categoryColor: '#ef4444',
    },
    {
      id: 5,
      title: '크로스 플랫폼 개발의 미래: Flutter vs React Native',
      description:
        '하나의 코드로 iOS와 Android를 동시에 개발하는 최신 기술 비교',
      tags: ['#Flutter', '#ReactNative', '#크로스플랫폼', '#모바일앱'],
      category: '모바일',
      categoryColor: '#ec4899',
    },
    {
      id: 6,
      title: '빅데이터 분석의 새로운 지평: 실시간 처리의 중요성',
      description: 'Apache Kafka와 Spark를 활용한 대규모 데이터 스트리밍 분석',
      tags: ['#빅데이터', '#Kafka', '#Spark', '#실시간분석'],
      category: '데이터사이언스',
      categoryColor: '#f59e0b',
    },
    {
      id: 7,
      title: 'Web3의 현실: 블록체인이 바꾸는 인터넷',
      description: '탈중앙화 기술이 가져올 디지털 소유권과 프라이버시의 혁명',
      tags: ['#Web3', '#블록체인', '#NFT', '#DeFi'],
      category: '블록체인',
      categoryColor: '#14b8a6',
    },
    {
      id: 8,
      title: 'DevOps에서 Platform Engineering으로의 전환',
      description: '개발자 경험을 혁신하는 내부 개발자 플랫폼 구축 가이드',
      tags: ['#DevOps', '#Platform Engineering', '#IDP', '#개발자경험'],
      category: 'DevOps',
      categoryColor: '#6366f1',
    },
  ];

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
          <button className={styles.loginButton}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M9 1.5C9.41421 1.5 9.75 1.83579 9.75 2.25V7.5H14.25C14.6642 7.5 15 7.83579 15 8.25C15 8.66421 14.6642 9 14.25 9H9.75V14.25C9.75 14.6642 9.41421 15 9 15C8.58579 15 8.25 14.6642 8.25 14.25V9H3.75C3.33579 9 3 8.66421 3 8.25C3 7.83579 3.33579 7.5 3.75 7.5H8.25V2.25C8.25 1.83579 8.58579 1.5 9 1.5Z"
                fill="#6b7280"
              />
            </svg>
            로그인
          </button>
          <button className={styles.writeButton}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M9 1.5C9.41421 1.5 9.75 1.83579 9.75 2.25V7.5H14.25C14.6642 7.5 15 7.83579 15 8.25C15 8.66421 14.6642 9 14.25 9H9.75V14.25C9.75 14.6642 9.41421 15 9 15C8.58579 15 8.25 14.6642 8.25 14.25V9H3.75C3.33579 9 3 8.66421 3 8.25C3 7.83579 3.33579 7.5 3.75 7.5H8.25V2.25C8.25 1.83579 8.58579 1.5 9 1.5Z"
                fill="white"
              />
            </svg>
            글쓰기
          </button>
          <button className={styles.subscribeButton}>
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
        {articles.map((article) => (
          <article key={article.id} className={styles.articleCard}>
            <div className={styles.imageContainer}>
              <div className={styles.imagePlaceholder}>
                <div
                  className={styles.categoryBadge}
                  style={{ backgroundColor: article.categoryColor }}
                >
                  {article.category}
                </div>
              </div>
            </div>
            <div className={styles.content}>
              <h2 className={styles.articleTitle}>{article.title}</h2>
              <p className={styles.articleDescription}>{article.description}</p>
              <div className={styles.tags}>
                {article.tags.map((tag, index) => (
                  <span key={index} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
