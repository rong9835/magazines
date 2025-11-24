'use client';

import { useState, useEffect } from 'react';
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

  // 로그인 상태 조회
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserProfile(session.user);
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
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setUserProfile(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 사용자 프로필 정보 가져오기
  const fetchUserProfile = async (user: User) => {
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
  };

  // 로그아웃
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('로그아웃 오류:', error);
        throw error;
      }
      // 로그아웃 성공 후 로그인 페이지로 이동
      router.push('/auth/login');
    } catch (error) {
      console.error('로그아웃 실패:', error);
      throw error;
    }
  };

  // 마이페이지로 이동
  const handleGoToMyPage = () => {
    router.push('/mypages');
  };

  // 로그인 페이지로 이동
  const handleGoToLogin = () => {
    router.push('/auth/login');
  };

  return {
    user,
    userProfile,
    isLoading,
    isLoggedIn: !!user,
    handleLogout,
    handleGoToMyPage,
    handleGoToLogin,
  };
};

