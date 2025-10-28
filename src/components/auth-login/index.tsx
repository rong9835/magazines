'use client';

import styles from './styles.module.css';

export default function AuthLogin() {
  const handleGoogleLogin = () => {
    // Google 로그인 로직 구현 필요
    console.log('Google login clicked');
  };

  const handleBrowseFree = () => {
    // 무료 콘텐츠 둘러보기
    window.location.href = '/magazines';
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* 로고/아이콘 영역 */}
        <div className={styles.logoContainer}>
          <div className={styles.logoIcon}>
            {/* SVG 아이콘 또는 이미지 */}
          </div>
        </div>

        {/* 헤딩 */}
        <h1 className={styles.heading}>IT 매거진</h1>

        {/* 부제목 */}
        <p className={styles.subtitle}>
          최신 기술 트렌드와 인사이트를 한곳에서
        </p>

        {/* 설명 */}
        <p className={styles.description}>
          로그인하고 개인 맞춤형 콘텐츠를 추천받으세요
        </p>

        {/* Google 로그인 버튼 */}
        <button
          className={styles.googleButton}
          onClick={handleGoogleLogin}
        >
          <div className={styles.googleIcon}>
            {/* Google 아이콘 SVG */}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.868h5.382a4.6 4.6 0 01-1.996 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.35z" fill="#4285F4"/>
              <path d="M10 20c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.595-4.123H1.064v2.59A9.996 9.996 0 0010 20z" fill="#34A853"/>
              <path d="M4.405 11.9c-.2-.6-.314-1.24-.314-1.9 0-.66.114-1.3.314-1.9V5.51H1.064A9.996 9.996 0 000 10c0 1.614.386 3.14 1.064 4.49l3.34-2.59z" fill="#FBBC05"/>
              <path d="M10 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C14.959.99 12.695 0 10 0 6.09 0 2.71 2.24 1.064 5.51l3.34 2.59C5.19 5.736 7.395 3.977 10 3.977z" fill="#EA4335"/>
            </svg>
          </div>
          <span>Google로 계속하기</span>
        </button>

        {/* 구분선 */}
        <div className={styles.dividerContainer}>
          <div className={styles.dividerLine}></div>
          <div className={styles.dividerText}>
            <span>또는</span>
          </div>
          <div className={styles.dividerLine}></div>
        </div>

        {/* 무료 둘러보기 버튼 */}
        <button
          className={styles.freeButton}
          onClick={handleBrowseFree}
        >
          로그인 없이 무료 콘텐츠 둘러보기
        </button>

        {/* 약관 동의 */}
        <div className={styles.termsText}>
          <span className={styles.termsGray}>로그인하면 </span>
          <a href="/terms" className={styles.termsLink}>이용약관</a>
          <span className={styles.termsGray}> 및 </span>
          <a href="/privacy" className={styles.termsLink}>개인정보처리방침</a>
          <span className={styles.termsGray}>에 동의하게 됩니다</span>
        </div>

        {/* 혜택 목록 */}
        <div className={styles.benefitsContainer}>
          <div className={styles.benefitItem}>
            <div className={styles.benefitIcon}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill="#6b7280"/>
              </svg>
            </div>
            <span className={styles.benefitText}>무료 회원가입</span>
          </div>

          <div className={styles.benefitItem}>
            <div className={styles.benefitIcon}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill="#6b7280"/>
              </svg>
            </div>
            <span className={styles.benefitText}>맞춤형 콘텐츠 추천</span>
          </div>

          <div className={styles.benefitItem}>
            <div className={styles.benefitIcon}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill="#6b7280"/>
              </svg>
            </div>
            <span className={styles.benefitText}>북마크 & 저장</span>
          </div>
        </div>
      </div>
    </div>
  );
}
