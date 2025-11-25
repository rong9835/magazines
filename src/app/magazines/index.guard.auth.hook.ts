'use client';

import { useLoginLogoutStatus } from '@/app/magazines/index.login.logout.status.hook';

/**
 * 로그인 액션 GUARD Hook
 * 로그인 여부를 검사하고, 비로그인시 알림을 띄우고 작업을 중단합니다.
 */
export const useGuardAuth = () => {
  const { isLoggedIn, isLoading } = useLoginLogoutStatus();

  /**
   * 로그인 액션 GUARD
   * @param callback - 로그인 상태일 때 실행할 콜백 함수
   * @returns 로그인 여부 (true: 로그인됨, false: 비로그인)
   */
  const guardAuth = (callback?: () => void): boolean => {
    // 로딩 중이면 작업을 중단
    if (isLoading) {
      return false;
    }

    // 비로그인시 알림을 띄우고 작업을 중단
    if (!isLoggedIn) {
      alert('로그인 후 이용 가능합니다');
      return false;
    }

    // 로그인 상태일 때 콜백 실행
    if (callback) {
      callback();
    }

    return true;
  };

  return {
    guardAuth,
    isLoggedIn,
    isLoading,
  };
};

