'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email?: string;
  name?: string;
  avatar_url?: string;
}

export const useLoginLogoutStatus = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // 사용자 프로필 정보 가져오기
  const fetchUserProfile = useCallback(async (user: User) => {
    try {
      // user_metadata에서 프로필 정보 가져오기
      const metadata = user.user_metadata;
      const profile: UserProfile = {
        id: user.id,
        email: user.email,
        name: metadata?.full_name || metadata?.name || user.email?.split('@')[0] || '사용자',
        avatar_url: metadata?.avatar_url || metadata?.picture || undefined,
      };
      setUserProfile(profile);
    } catch (error) {
      console.error('프로필 정보 가져오기 오류:', error);
      // 기본 프로필 정보 설정
      setUserProfile({
        id: user.id,
        email: user.email,
        name: user.email?.split('@')[0] || '사용자',
      });
    }
  }, []);

  // 로그인 상태 조회
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('세션 확인 오류:', error);
          setUser(null);
          setUserProfile(null);
          return;
        }

        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          setUserProfile(null);
        }
      } catch (error) {
        console.error('세션 확인 오류:', error);
        setUser(null);
        setUserProfile(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          await fetchUserProfile(session.user);
          setIsLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setUserProfile(null);
          setIsLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // 토큰 갱신 시 사용자 정보 업데이트
          setUser(session.user);
          await fetchUserProfile(session.user);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  // 로그아웃
  const handleLogout = useCallback(async () => {
    try {
      setIsLoggingOut(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('로그아웃 오류:', error);
        throw error;
      }
      // 로그아웃 성공 후 로그인 페이지로 이동
      router.push('/auth/login');
    } catch (error) {
      console.error('로그아웃 실패:', error);
      setIsLoggingOut(false);
      throw error;
    }
  }, [router]);

  // 마이페이지로 이동
  const handleGoToMyPage = useCallback(() => {
    router.push('/mypages');
  }, [router]);

  // 로그인 페이지로 이동
  const handleGoToLogin = useCallback(() => {
    router.push('/auth/login');
  }, [router]);

  return {
    user,
    userProfile,
    isLoading,
    isLoggingOut,
    isLoggedIn: !!user,
    handleLogout,
    handleGoToMyPage,
    handleGoToLogin,
  };
};


