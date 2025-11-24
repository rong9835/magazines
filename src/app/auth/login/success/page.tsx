'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginSuccessPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        // 현재 세션 확인
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('세션 확인 오류:', error);
          // 오류 발생 시에도 메인 페이지로 이동
          router.push('/magazines');
          return;
        }

        // 세션이 이미 존재하는 경우
        if (session) {
          setIsLoading(false);
          router.push('/magazines');
          return;
        }

        // 세션이 없는 경우, 세션 설정을 기다림
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            if (event === 'SIGNED_IN' && session) {
              setIsLoading(false);
              router.push('/magazines');
            }
          }
        );

        // 타임아웃 설정 (30초 후에도 세션이 없으면 메인 페이지로 이동)
        const timeout = setTimeout(() => {
          setIsLoading(false);
          router.push('/magazines');
        }, 30000);

        // 정리 함수
        return () => {
          subscription.unsubscribe();
          clearTimeout(timeout);
        };
      } catch (error) {
        console.error('세션 확인 중 오류 발생:', error);
        setIsLoading(false);
        router.push('/magazines');
      }
    };

    checkSession();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
        <p className="text-gray-600 text-lg">로그인 처리 중...</p>
        <p className="text-gray-400 text-sm mt-2">잠시만 기다려주세요</p>
      </div>
    </div>
  );
}

