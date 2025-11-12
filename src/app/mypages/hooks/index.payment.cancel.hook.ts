import { useState } from 'react';

type CancelResponse = {
  success: boolean;
  error?: string;
  checklist?: Array<{
    step: string;
    status: 'passed' | 'failed';
    detail: string;
  }>;
};

export function usePaymentCancel() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelSubscription = async (transactionKey: string) => {
    console.log('🔴 [CLIENT] 구독 취소 시작:', transactionKey);
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔴 [CLIENT] /api/payments/cancel API 호출 시작');
      const response = await fetch('/api/payments/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionKey,
        }),
      });
      console.log('🔴 [CLIENT] /api/payments/cancel API 응답 받음:', response.status);

      const data: CancelResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '구독 취소에 실패했습니다.');
      }

      console.log('✅ [CLIENT] 구독 취소 성공');
      // 알림 메시지
      alert('구독이 취소되었습니다.');

      return { success: true, data };
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : '구독 취소 중 오류가 발생했습니다.';
      console.error('❌ [CLIENT] 구독 취소 실패:', errorMessage);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    cancelSubscription,
    isLoading,
    error,
  };
}
