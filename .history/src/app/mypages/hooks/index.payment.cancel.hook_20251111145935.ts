import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelSubscription = async (transactionKey: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionKey,
        }),
      });

      const data: CancelResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '구독 취소에 실패했습니다.');
      }

      // 알림 메시지
      alert('구독이 취소되었습니다.');

      // 페이지 이동
      router.push('/magazines');

      return { success: true, data };
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : '구독 취소 중 오류가 발생했습니다.';
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
