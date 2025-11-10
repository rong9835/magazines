'use client';

import { useRouter } from 'next/navigation';
import { useMagazinePayment } from '@/app/payments/hooks/index.payment.hook';
import styles from './styles.module.css';

export default function Payments() {
  const router = useRouter();
  const { subscribe, isProcessing, errorMessage, checklist } = useMagazinePayment();

  const handleBack = () => {
    router.push('/magazines');
  };

  const handleSubscribe = () => {
    void subscribe();
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <button className={styles.backButton} onClick={handleBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>목록으로</span>
        </button>

        <h1 className={styles.heading}>IT 매거진 구독</h1>
        <p className={styles.subtitle}>
          프리미엄 콘텐츠를 제한 없이 이용하세요
        </p>

        <div className={styles.card}>
          <div className={styles.planHeader}>
            <h2 className={styles.planTitle}>월간 구독</h2>
            <p className={styles.planDescription}>
              모든 IT 매거진 콘텐츠에 무제한 접근
            </p>
          </div>

          <div className={styles.priceSection}>
            <div className={styles.priceAmount}>9,900원</div>
            <div className={styles.pricePeriod}>/월</div>
          </div>

          <ul className={styles.featureList}>
            <li className={styles.featureItem}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 6L9 17L4 12"
                  stroke="#374151"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>모든 프리미엄 아티클 열람</span>
            </li>
            <li className={styles.featureItem}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 6L9 17L4 12"
                  stroke="#374151"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>최신 기술 트렌드 리포트</span>
            </li>
            <li className={styles.featureItem}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 6L9 17L4 12"
                  stroke="#374151"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>광고 없는 읽기 환경</span>
            </li>
            <li className={styles.featureItem}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 6L9 17L4 12"
                  stroke="#374151"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>언제든지 구독 취소 가능</span>
            </li>
          </ul>

          <button
            className={styles.subscribeButton}
            onClick={handleSubscribe}
            disabled={isProcessing}
            aria-busy={isProcessing}
          >
            {isProcessing ? '처리 중...' : '구독하기'}
          </button>

          {(errorMessage || checklist.length > 0) && (
            <div className={styles.statusContainer}>
              {errorMessage && (
                <p role="alert" className={styles.errorMessage}>
                  {errorMessage}
                </p>
              )}

              {checklist.length > 0 && (
                <div className={styles.checklistBox}>
                  <h3 className={styles.statusHeading}>처리 결과</h3>
                  <ul className={styles.statusList}>
                    {checklist.map((item) => (
                      <li key={`${item.step}-${item.status}`} className={styles.statusItem}>
                        <span className={styles.statusBadge} data-status={item.status}>
                          {item.status === 'passed' ? '완료' : '실패'}
                        </span>
                        <div className={styles.statusContent}>
                          <span className={styles.statusStep}>{item.step}</span>
                          <span className={styles.statusDetail}>{item.detail}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
