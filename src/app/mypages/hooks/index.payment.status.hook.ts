import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type SubscriptionStatus = 'subscribed' | 'free' | 'loading';

type PaymentRecord = {
  transaction_key: string;
  amount: number;
  status: string;
  start_at: string;
  end_at: string;
  end_grace_at: string;
  created_at: string;
};

type PaymentStatusResult = {
  subscriptionStatus: SubscriptionStatus;
  transactionKey?: string;
  error?: string;
  checklist: Array<{
    step: string;
    status: 'passed' | 'failed';
    detail: string;
  }>;
};

export function usePaymentStatus() {
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus>('loading');
  const [transactionKey, setTransactionKey] = useState<string | undefined>(
    undefined
  );
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
    fetchPaymentStatus();
  }, []);

  const fetchPaymentStatus = async (): Promise<PaymentStatusResult> => {
    const newChecklist: Array<{
      step: string;
      status: 'passed' | 'failed';
      detail: string;
    }> = [];

    try {
      setIsLoading(true);
      setError(null);

      console.log('🔵 [CLIENT] payment 상태 조회 시작');

      // 1-1-1) 로그인된 user_id 가져오기
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

      // 1-1) payment 테이블의 목록 조회 (내 결제 정보만 필터링: user_id === 로그인된 user_id)
      const { data: allPayments, error: fetchError } = await supabase
        .from('payment')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        const detail = `Supabase payment 테이블 조회 실패: ${fetchError.message}`;
        newChecklist.push({
          step: 'fetch-all-payments',
          status: 'failed',
          detail,
        });
        throw new Error(detail);
      }

      newChecklist.push({
        step: 'fetch-all-payments',
        status: 'passed',
        detail: `payment 테이블 조회 성공 (user_id: ${user.id}, 총 ${allPayments?.length || 0}건)`,
      });

      if (!allPayments || allPayments.length === 0) {
        newChecklist.push({
          step: 'check-payment-records',
          status: 'passed',
          detail: '결제 레코드가 없음 - Free 상태',
        });

        setSubscriptionStatus('free');
        setTransactionKey(undefined);
        setChecklist(newChecklist);
        return {
          subscriptionStatus: 'free',
          checklist: newChecklist,
        };
      }

      // 1-1-1) transaction_key 그룹화 및 각 그룹에서 created_at 최신 1건씩 추출
      const groupedByTransactionKey = new Map<string, PaymentRecord>();

      (allPayments as PaymentRecord[]).forEach((payment) => {
        const existing = groupedByTransactionKey.get(payment.transaction_key);

        if (
          !existing ||
          new Date(payment.created_at) > new Date(existing.created_at)
        ) {
          groupedByTransactionKey.set(payment.transaction_key, payment);
        }
      });

      const latestPayments = Array.from(groupedByTransactionKey.values());

      newChecklist.push({
        step: 'group-by-transaction-key',
        status: 'passed',
        detail: `transaction_key로 그룹화 완료 (${latestPayments.length}개 그룹)`,
      });

      // 1-1-2) 필터링: status === "Paid" && start_at <= 현재시각 <= end_grace_at
      const now = new Date();
      const activeSubscriptions = latestPayments.filter((payment) => {
        const isStatusPaid = payment.status === 'Paid';
        const startAt = new Date(payment.start_at);
        const endGraceAt = new Date(payment.end_grace_at);
        const isInValidPeriod = startAt <= now && now <= endGraceAt;

        return isStatusPaid && isInValidPeriod;
      });

      newChecklist.push({
        step: 'filter-active-subscriptions',
        status: 'passed',
        detail: `활성 구독 필터링 완료 (${activeSubscriptions.length}건)`,
      });

      // 1-2) 조회 결과에 따른 로직
      if (activeSubscriptions.length > 0) {
        // 1건 이상: 구독중
        const activePayment = activeSubscriptions[0];

        newChecklist.push({
          step: 'set-subscription-status',
          status: 'passed',
          detail: `구독중 상태 설정 (transaction_key: ${activePayment.transaction_key})`,
        });

        setSubscriptionStatus('subscribed');
        setTransactionKey(activePayment.transaction_key);
        setChecklist(newChecklist);

        console.log('✅ [CLIENT] 구독중 상태 확인');
        return {
          subscriptionStatus: 'subscribed',
          transactionKey: activePayment.transaction_key,
          checklist: newChecklist,
        };
      } else {
        // 0건: Free
        newChecklist.push({
          step: 'set-subscription-status',
          status: 'passed',
          detail: 'Free 상태 설정',
        });

        setSubscriptionStatus('free');
        setTransactionKey(undefined);
        setChecklist(newChecklist);

        console.log('✅ [CLIENT] Free 상태 확인');
        return {
          subscriptionStatus: 'free',
          checklist: newChecklist,
        };
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'payment 상태 조회 중 오류가 발생했습니다.';

      console.error('❌ [CLIENT] payment 상태 조회 실패:', errorMessage);

      newChecklist.push({
        step: 'handle-error',
        status: 'failed',
        detail: errorMessage,
      });

      setError(errorMessage);
      setSubscriptionStatus('free');
      setTransactionKey(undefined);
      setChecklist(newChecklist);

      return {
        subscriptionStatus: 'free',
        error: errorMessage,
        checklist: newChecklist,
      };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    subscriptionStatus,
    transactionKey,
    isLoading,
    error,
    checklist,
    refetch: fetchPaymentStatus,
  };
}
