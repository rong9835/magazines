import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type UserProfile = {
  profileImage: string | null;
  nickname: string;
  email: string;
  joinDate: string;
};

type ProfileResult = {
  profile: UserProfile | null;
  error?: string;
  checklist: Array<{
    step: string;
    status: 'passed' | 'failed';
    detail: string;
  }>;
};

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [checklist, setChecklist] = useState<
    Array<{
      step: string;
      status: 'passed' | 'failed';
      detail: string;
    }>
  >([]);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async (): Promise<ProfileResult> => {
    const newChecklist: Array<{
      step: string;
      status: 'passed' | 'failed';
      detail: string;
    }> = [];

    try {
      setIsLoading(true);
      setError(null);

      console.log('🔵 [CLIENT] 프로필 조회 시작');

      // 1-1) 현재 세션의 유저 정보 조회
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        const detail = `Supabase 유저 정보 조회 실패: ${userError.message}`;
        newChecklist.push({
          step: 'fetch-user',
          status: 'failed',
          detail,
        });
        throw new Error(detail);
      }

      if (!user) {
        const detail = '로그인된 유저가 없습니다.';
        newChecklist.push({
          step: 'check-user-exists',
          status: 'failed',
          detail,
        });
        throw new Error(detail);
      }

      newChecklist.push({
        step: 'fetch-user',
        status: 'passed',
        detail: `유저 정보 조회 성공 (ID: ${user.id})`,
      });

      // 1-2) 프로필 데이터 구성
      // 프로필사진: user_metadata.avatar_url 또는 user_metadata.picture 또는 null
      const profileImage =
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        null;

      // 이름: user_metadata.full_name 또는 user_metadata.name 또는 email의 @ 앞부분
      const nickname =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        '사용자';

      // 이메일: user.email
      const email = user.email || '';

      // 가입일: created_at을 YYYY.MM 형식으로 변환
      const joinDate = user.created_at
        ? (() => {
            const date = new Date(user.created_at);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            return `${year}.${month}`;
          })()
        : '';

      const profileData: UserProfile = {
        profileImage,
        nickname,
        email,
        joinDate,
      };

      newChecklist.push({
        step: 'build-profile-data',
        status: 'passed',
        detail: '프로필 데이터 구성 완료',
      });

      setProfile(profileData);
      setChecklist(newChecklist);

      console.log('✅ [CLIENT] 프로필 조회 성공');

      return {
        profile: profileData,
        checklist: newChecklist,
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : '프로필 조회 중 오류가 발생했습니다.';

      console.error('❌ [CLIENT] 프로필 조회 실패:', errorMessage);

      newChecklist.push({
        step: 'handle-error',
        status: 'failed',
        detail: errorMessage,
      });

      setError(errorMessage);
      setProfile(null);
      setChecklist(newChecklist);

      return {
        profile: null,
        error: errorMessage,
        checklist: newChecklist,
      };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    profile,
    isLoading,
    error,
    checklist,
    refetch: fetchProfile,
  };
}

