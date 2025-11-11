'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import PortOne from '@portone/browser-sdk/v2';

type ChecklistItem = {
  step: string;
  status: 'passed' | 'failed';
  detail: string;
};

type SubscribeOptions = {
  customerId?: string;
};

const DEFAULT_ORDER_NAME = 'IT 매거진 월간 구독';
const DEFAULT_AMOUNT = 9900;

// 클라이언트 컴포넌트에서 환경변수를 읽기 위해 모듈 최상단에서 선언
const PORTONE_STORE_ID = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
const PORTONE_CHANNEL_KEY = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY;
const PORTONE_CUSTOMER_ID = process.env.NEXT_PUBLIC_PORTONE_CUSTOMER_ID;

async function safeParseJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function useMagazinePayment() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const isProcessingRef = useRef(false);

  const subscribe = useCallback(
    async (options?: SubscribeOptions) => {
      console.log('🔵 [CLIENT] subscribe 함수 호출됨');

      // useRef를 사용해 동기적으로 중복 호출 방지
      if (isProcessingRef.current) {
        console.log('⚠️ [CLIENT] 이미 처리 중입니다. 중복 호출이 차단되었습니다.');
        return;
      }

      isProcessingRef.current = true;
      setIsProcessing(true);
      setErrorMessage(null);
      setChecklist([]);

      const resultChecklist: ChecklistItem[] = [];

      try {
        const storeId = PORTONE_STORE_ID;
        const channelKey = PORTONE_CHANNEL_KEY;
        const customerId = options?.customerId ?? PORTONE_CUSTOMER_ID ?? 'magazine-demo-customer';

        if (!storeId || !channelKey) {
          const detail = '포트원 상점 정보가 구성되지 않았습니다. 환경변수를 확인해주세요.';
          resultChecklist.push({
            step: 'load-environment',
            status: 'failed',
            detail,
          });
          setChecklist(resultChecklist);
          setErrorMessage(detail);
          return;
        }

        resultChecklist.push({
          step: 'load-environment',
          status: 'passed',
          detail: '포트원 상점 정보 로드 완료',
        });

        const portoneCustomer = {
          customerId,
        };

        const issueResponse = await PortOne.requestIssueBillingKey({
          storeId,
          channelKey,
          billingKeyMethod: 'CARD',
          customer: portoneCustomer,
          customData: {
            plan: 'magazine-monthly',
          },
        });

        if (!issueResponse) {
          const detail = '빌링키 발급 응답이 수신되지 않았습니다.';
          resultChecklist.push({
            step: 'issue-billing-key',
            status: 'failed',
            detail,
          });
          setChecklist(resultChecklist);
          setErrorMessage(detail);
          return;
        }

        if (issueResponse.code !== undefined) {
          const detail = issueResponse.message ?? '빌링키 발급에 실패했습니다.';
          resultChecklist.push({
            step: 'issue-billing-key',
            status: 'failed',
            detail,
          });
          setChecklist(resultChecklist);
          setErrorMessage(detail);
          return;
        }

        if (!issueResponse.billingKey) {
          const detail = '빌링키가 반환되지 않았습니다.';
          resultChecklist.push({
            step: 'issue-billing-key',
            status: 'failed',
            detail,
          });
          setChecklist(resultChecklist);
          setErrorMessage(detail);
          return;
        }

        resultChecklist.push({
          step: 'issue-billing-key',
          status: 'passed',
          detail: '빌링키 발급 완료',
        });

        console.log('🔵 [CLIENT] /api/payments API 호출 시작');
        const paymentResponse = await fetch('/api/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            billingKey: issueResponse.billingKey,
            orderName: DEFAULT_ORDER_NAME,
            amount: DEFAULT_AMOUNT,
            customer: {
              id: customerId,
            },
          }),
        });
        console.log('🔵 [CLIENT] /api/payments API 응답 받음:', paymentResponse.status);

        const parsed = await safeParseJson<{
          success: boolean;
          error?: string;
          checklist?: ChecklistItem[];
        }>(paymentResponse);

        if (parsed?.checklist?.length) {
          resultChecklist.push(...parsed.checklist);
        }

        if (!paymentResponse.ok || !parsed?.success) {
          const detail = parsed?.error ?? '포트원 결제 API 요청에 실패했습니다.';
          resultChecklist.push({
            step: 'request-payment',
            status: 'failed',
            detail,
          });
          setChecklist(resultChecklist);
          setErrorMessage(detail);
          return;
        }

        resultChecklist.push({
          step: 'request-payment',
          status: 'passed',
          detail: '빌링키 결제 요청 완료',
        });

        setChecklist(resultChecklist);
        alert('구독에 성공하였습니다.');
        router.push('/magazines');
      } catch (error) {
        const detail = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
        resultChecklist.push({
          step: 'unexpected-error',
          status: 'failed',
          detail,
        });
        setChecklist(resultChecklist);
        setErrorMessage(detail);
      } finally {
        isProcessingRef.current = false;
        setIsProcessing(false);
      }
    },
    [router],
  );

  return {
    subscribe,
    isProcessing,
    errorMessage,
    checklist,
  };
}

