'use client';

import { useRouter } from 'next/navigation';
import styles from './styles.module.css';
import { usePaymentCancel } from './hooks/index.payment.cancel.hook';
import { usePaymentStatus } from './hooks/index.payment.status.hook';
import { useMagazinePayment } from '@/app/payments/hooks/index.payment.hook';

interface UserProfile {
  profileImage: string;
  nickname: string;
  bio: string;
  joinDate: string;
}

const mockUserData: UserProfile = {
  profileImage:
    'https://images.unsplash.com/photo-1613145997970-db84a7975fbb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9maWxlJTIwcG9ydHJhaXQlMjBwZXJzb258ZW58MXx8fHwxNzYyNTkxMjU5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  nickname: '테크러버',
  bio: '최신 IT 트렌드와 개발 이야기를 공유합니다',
  joinDate: '2024.03',
};

function GlossaryMagazinesMypage() {
  const router = useRouter();
  const user = mockUserData;
  const { cancelSubscription, isLoading } = usePaymentCancel();
  const {
    subscriptionStatus: paymentStatus,
    transactionKey: paymentTransactionKey,
    isLoading: isLoadingStatus,
    refetch,
  } = usePaymentStatus();
  const { subscribe, isProcessing } = useMagazinePayment();

  const handleBackToList = () => {
    router.push('/magazines');
  };

  const handleSubscribe = async () => {
    const success = await subscribe();
    if (success) {
      // 결제 성공 후 최신 구독 상태를 가져와서 UI 업데이트
      await refetch();
    }
  };

  const handleCancelSubscription = async () => {
    if (confirm('구독을 취소하시겠습니까?')) {
      if (!paymentTransactionKey) {
        alert('결제 정보를 찾을 수 없습니다.');
        return;
      }

      const result = await cancelSubscription(paymentTransactionKey);
      if (result.success) {
        // 취소 성공 후 최신 구독 상태를 가져와서 UI 업데이트
        await refetch();
        // 페이지는 그대로 유지하고 상태만 업데이트
      }
    }
  };

  const isSubscribed = paymentStatus === 'subscribed';

  return (
    <div className={styles.mypageWrapper}>
      <button className={styles.backBtn} onClick={handleBackToList}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12.5 15L7.5 10L12.5 5" />
        </svg>
        목록으로
      </button>

      <div className={styles.header}>
        <h1>IT 매거진 구독</h1>
        <p className={styles.headerDesc}>
          프리미엄 콘텐츠를 제한 없이 이용하세요
        </p>
      </div>

      <div className={styles.grid}>
        {/* 프로필 카드 */}
        <div className={styles.profileCard}>
          <img
            src={user.profileImage}
            alt={user.nickname}
            className={styles.avatar}
          />
          <h2 className={styles.name}>{user.nickname}</h2>
          <p className={styles.bioText}>{user.bio}</p>
          <div className={styles.joinDate}>가입일 {user.joinDate}</div>
        </div>

        {/* 구독 플랜 카드 */}
        <div
          className={`${styles.subscriptionCard} ${
            isSubscribed ? styles.active : ''
          }`}
        >
          <div className={styles.subscriptionHeader}>
            <h3 className={styles.cardTitle}>구독 플랜</h3>
            {isLoadingStatus ? (
              <span className={styles.badgeActive}>확인중...</span>
            ) : isSubscribed ? (
              <span className={styles.badgeActive}>구독중</span>
            ) : (
              <span className={styles.badgeActive}>Free</span>
            )}
          </div>

          {isSubscribed ? (
            <div className={styles.subscriptionActive}>
              <div className={styles.planName}>IT Magazine Premium</div>
              <div className={styles.planFeatures}>
                <div className={styles.featureItem}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M13.3337 4L6.00033 11.3333L2.66699 8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>모든 프리미엄 콘텐츠 무제한 이용</span>
                </div>
                <div className={styles.featureItem}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M13.3337 4L6.00033 11.3333L2.66699 8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>매주 새로운 IT 트렌드 리포트</span>
                </div>
                <div className={styles.featureItem}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M13.3337 4L6.00033 11.3333L2.66699 8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>광고 없는 깔끔한 읽기 환경</span>
                </div>
              </div>
              <button
                className={styles.cancelBtn}
                onClick={handleCancelSubscription}
                disabled={isLoading || isLoadingStatus}
              >
                {isLoading ? '처리 중...' : '구독 취소'}
              </button>
            </div>
          ) : (
            <div className={styles.subscriptionInactive}>
              <div className={styles.unsubscribedMessage}>
                구독하고 프리미엄 콘텐츠를 즐겨보세요
              </div>
              <div className={styles.planPreview}>
                <div className={styles.previewItem}>✓ 모든 프리미엄 콘텐츠</div>
                <div className={styles.previewItem}>✓ 매주 트렌드 리포트</div>
                <div className={styles.previewItem}>✓ 광고 없는 환경</div>
              </div>
              <button
                className={styles.subscribeBtn}
                onClick={handleSubscribe}
                disabled={isLoadingStatus || isProcessing}
              >
                {isProcessing ? '결제 처리 중...' : isLoadingStatus ? '확인 중...' : '지금 구독하기'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GlossaryMagazinesMypage;
