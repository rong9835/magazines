import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Force Node.js runtime (not Edge)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CancelRequestBody = {
  transactionKey: string;
};

type ChecklistItem = {
  step: string;
  status: 'passed' | 'failed';
  detail: string;
};

type ApiResponse =
  | {
      success: true;
      checklist: ChecklistItem[];
    }
  | {
      success: false;
      error: string;
      checklist: ChecklistItem[];
    };

type PaymentRecord = {
  transaction_key: string;
  amount: number;
  status: string;
  start_at: string;
  end_at: string;
  end_grace_at: string;
  next_schedule_at: string;
  next_schedule_id: string;
};

type PortonePaymentDetail = {
  id?: string;
  billingKey?: string;
  orderName?: string;
  amount?: {
    total?: number;
  };
  customer?: {
    id?: string;
  };
};

type ScheduledPayment = {
  id: string;
  paymentId: string;
};

const PORTONE_API_BASE_URL = 'https://api.portone.io';
const PORTONE_CANCEL_PATH = (transactionKey: string) =>
  `${PORTONE_API_BASE_URL}/payments/${encodeURIComponent(transactionKey)}/cancel`;

function validateRequestBody(body: unknown): {
  data?: CancelRequestBody;
  checklist: ChecklistItem[];
  error?: string;
} {
  const checklist: ChecklistItem[] = [];

  if (typeof body !== 'object' || body === null) {
    const detail = '요청 본문이 객체 형태가 아닙니다.';
    checklist.push({
      step: 'validate-request-body',
      status: 'failed',
      detail,
    });
    return { error: detail, checklist };
  }

  const { transactionKey } = body as Record<string, unknown>;

  if (typeof transactionKey !== 'string' || transactionKey.trim() === '') {
    const detail = 'transactionKey 값이 유효한 문자열이어야 합니다.';
    checklist.push({
      step: 'validate-transaction-key',
      status: 'failed',
      detail,
    });
    return { error: detail, checklist };
  }

  checklist.push({
    step: 'validate-request-body',
    status: 'passed',
    detail: '요청 본문 검증 완료',
  });

  return {
    data: {
      transactionKey: transactionKey.trim(),
    },
    checklist,
  };
}

async function requestPortoneCancel(args: {
  transactionKey: string;
  secret: string;
}): Promise<{ checklist: ChecklistItem[] }> {
  const { transactionKey, secret } = args;
  const checklist: ChecklistItem[] = [];

  const response = await fetch(PORTONE_CANCEL_PATH(transactionKey), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `PortOne ${secret}`,
    },
    body: JSON.stringify({
      reason: '취소 사유 없음',
    }),
  });

  if (!response.ok) {
    const errorBody = await safeParseJson(response);
    const detail = `PortOne 결제 취소 API 호출 실패 (${response.status}): ${
      typeof errorBody === 'object' && errorBody !== null
        ? JSON.stringify(errorBody)
        : response.statusText
    }`;
    checklist.push({
      step: 'request-portone-cancel',
      status: 'failed',
      detail,
    });
    throw new Error(detail);
  }

  checklist.push({
    step: 'request-portone-cancel',
    status: 'passed',
    detail: 'PortOne 결제 취소 요청 성공',
  });

  return { checklist };
}

async function safeParseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function createSupabaseClient(): {
  client?: SupabaseClient;
  checklist: ChecklistItem[];
  error?: string;
} {
  const checklist: ChecklistItem[] = [];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const detail =
      'Supabase 환경변수(NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY)가 설정되지 않았습니다.';
    checklist.push({
      step: 'load-supabase-config',
      status: 'failed',
      detail,
    });
    return { error: detail, checklist };
  }

  checklist.push({
    step: 'load-supabase-config',
    status: 'passed',
    detail: 'Supabase 환경변수 로드 완료',
  });

  const client = createClient(supabaseUrl, supabaseAnonKey);

  return { client, checklist };
}

async function fetchPortonePaymentDetail(
  paymentId: string,
  secret: string
): Promise<{
  detail?: PortonePaymentDetail;
  checklist: ChecklistItem[];
}> {
  const checklist: ChecklistItem[] = [];
  const response = await fetch(
    `${PORTONE_API_BASE_URL}/payments/${encodeURIComponent(paymentId)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `PortOne ${secret}`,
      },
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    const errorBody = await safeParseJson(response);
    const detail = `PortOne 결제 조회 실패 (${response.status}): ${
      typeof errorBody === 'object' && errorBody !== null
        ? JSON.stringify(errorBody)
        : response.statusText
    }`;
    checklist.push({
      step: 'fetch-portone-payment',
      status: 'failed',
      detail,
    });
    throw new Error(detail);
  }

  const detail = (await safeParseJson(response)) as PortonePaymentDetail | null;
  if (!detail) {
    const message = 'PortOne 결제 조회 응답이 비어 있습니다.';
    checklist.push({
      step: 'fetch-portone-payment',
      status: 'failed',
      detail: message,
    });
    throw new Error(message);
  }

  checklist.push({
    step: 'fetch-portone-payment',
    status: 'passed',
    detail: 'PortOne 결제 정보 조회 성공',
  });

  return { detail, checklist };
}

async function queryPaymentRecord(args: {
  supabase: SupabaseClient;
  transactionKey: string;
}): Promise<{
  record?: PaymentRecord;
  checklist: ChecklistItem[];
}> {
  const { supabase, transactionKey } = args;
  const checklist: ChecklistItem[] = [];

  const { data, error } = await supabase
    .from('payment')
    .select('*')
    .eq('transaction_key', transactionKey)
    .single();

  if (error || !data) {
    const detail = `Supabase payment 조회 실패: ${error?.message || '레코드를 찾을 수 없습니다'}`;
    checklist.push({
      step: 'query-payment-record',
      status: 'failed',
      detail,
    });
    throw new Error(detail);
  }

  checklist.push({
    step: 'query-payment-record',
    status: 'passed',
    detail: 'Supabase payment 테이블 조회 성공',
  });

  return { record: data as PaymentRecord, checklist };
}

async function insertCancellationRecord(args: {
  supabase: SupabaseClient;
  record: PaymentRecord;
}): Promise<ChecklistItem[]> {
  const { supabase, record } = args;
  const checklist: ChecklistItem[] = [];

  const { error } = await supabase.from('payment').insert({
    transaction_key: record.transaction_key,
    amount: -record.amount,
    status: 'Cancel',
    start_at: record.start_at,
    end_at: record.end_at,
    end_grace_at: record.end_grace_at,
    next_schedule_at: record.next_schedule_at,
    next_schedule_id: record.next_schedule_id,
  });

  if (error) {
    const detail = `Supabase 취소 레코드 등록 실패: ${error.message}`;
    checklist.push({
      step: 'insert-cancellation-record',
      status: 'failed',
      detail,
    });
    throw new Error(detail);
  }

  checklist.push({
    step: 'insert-cancellation-record',
    status: 'passed',
    detail: 'Supabase 취소 레코드 등록 성공',
  });

  return checklist;
}

async function queryScheduledPayments(args: {
  secret: string;
  billingKey: string;
  fromDate: string;
  untilDate: string;
}): Promise<{
  items?: ScheduledPayment[];
  checklist: ChecklistItem[];
}> {
  const { secret, billingKey, fromDate, untilDate } = args;
  const checklist: ChecklistItem[] = [];

  try {
    const response = await axios.get(
      `${PORTONE_API_BASE_URL}/payment-schedules`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `PortOne ${secret}`,
        },
        params: {
          billingKey,
          from: fromDate,
          until: untilDate,
        },
      }
    );

    if (response.status !== 200) {
      const detail = `PortOne 예약 결제 조회 실패 (${response.status})`;
      checklist.push({
        step: 'query-scheduled-payments',
        status: 'failed',
        detail,
      });
      throw new Error(detail);
    }

    checklist.push({
      step: 'query-scheduled-payments',
      status: 'passed',
      detail: 'PortOne 예약 결제 조회 성공',
    });

    return { items: response.data?.items || [], checklist };
  } catch (error) {
    const detail =
      error instanceof Error
        ? error.message
        : 'PortOne 예약 결제 조회 중 오류 발생';
    checklist.push({
      step: 'query-scheduled-payments',
      status: 'failed',
      detail,
    });
    throw new Error(detail);
  }
}

async function deleteScheduledPayments(args: {
  secret: string;
  scheduleIds: string[];
}): Promise<ChecklistItem[]> {
  const { secret, scheduleIds } = args;
  const checklist: ChecklistItem[] = [];

  try {
    const response = await axios.delete(
      `${PORTONE_API_BASE_URL}/payment-schedules`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `PortOne ${secret}`,
        },
        data: {
          scheduleIds,
        },
      }
    );

    if (response.status !== 200) {
      const detail = `PortOne 예약 결제 삭제 실패 (${response.status})`;
      checklist.push({
        step: 'delete-scheduled-payments',
        status: 'failed',
        detail,
      });
      throw new Error(detail);
    }

    checklist.push({
      step: 'delete-scheduled-payments',
      status: 'passed',
      detail: 'PortOne 예약 결제 삭제 성공',
    });

    return checklist;
  } catch (error) {
    const detail =
      error instanceof Error
        ? error.message
        : 'PortOne 예약 결제 삭제 중 오류 발생';
    checklist.push({
      step: 'delete-scheduled-payments',
      status: 'failed',
      detail,
    });
    throw new Error(detail);
  }
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse>> {
  const cancelId = crypto.randomUUID().substring(0, 8);
  console.log(`🔴 [CANCEL ${cancelId}] POST /api/payments/cancel 호출됨`);

  const checklist: ChecklistItem[] = [];

  try {
    const body = await req.json();
    console.log(`🔴 [CANCEL ${cancelId}] 요청 본문:`, JSON.stringify(body, null, 2));
    const {
      data,
      checklist: validationChecklist,
      error: validationError,
    } = validateRequestBody(body);
    checklist.push(...validationChecklist);

    if (!data || validationError) {
      return NextResponse.json(
        {
          success: false,
          error: validationError ?? '요청 본문 검증에 실패했습니다.',
          checklist,
        },
        { status: 400 }
      );
    }

    const secret = process.env.PORTONE_API_SECRET;
    if (!secret) {
      const detail = 'PORTONE_API_SECRET 환경변수가 설정되지 않았습니다.';
      checklist.push({
        step: 'load-portone-secret',
        status: 'failed',
        detail,
      });
      return NextResponse.json(
        {
          success: false,
          error: detail,
          checklist,
        },
        { status: 500 }
      );
    }

    checklist.push({
      step: 'load-portone-secret',
      status: 'passed',
      detail: 'PortOne 비밀키 로드 완료',
    });

    // Step 1: PortOne 결제 취소 요청
    try {
      const { checklist: portoneChecklist } = await requestPortoneCancel({
        transactionKey: data.transactionKey,
        secret,
      });
      checklist.push(...portoneChecklist);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'PortOne 결제 취소 요청 중 오류가 발생했습니다.',
          checklist,
        },
        { status: 502 }
      );
    }

    // Step 2: PortOne 결제 상세 정보 조회 (billingKey 가져오기)
    let paymentDetail: PortonePaymentDetail | undefined;
    try {
      const { detail, checklist: fetchChecklist } =
        await fetchPortonePaymentDetail(data.transactionKey, secret);
      checklist.push(...fetchChecklist);
      paymentDetail = detail;
    } catch (error) {
      // 결제 정보 조회 실패 시에도 계속 진행 (이미 취소는 성공했으므로)
      checklist.push({
        step: 'handle-fetch-payment-error',
        status: 'failed',
        detail:
          error instanceof Error
            ? error.message
            : 'PortOne 결제 조회 중 오류가 발생했습니다. (취소는 완료됨)',
      });
    }

    // Step 3: Supabase 클라이언트 생성
    const {
      client: supabase,
      checklist: supabaseChecklist,
      error: supabaseError,
    } = createSupabaseClient();
    checklist.push(...supabaseChecklist);

    if (!supabase || supabaseError) {
      // Supabase 연결 실패해도 취소는 성공했으므로 경고만
      checklist.push({
        step: 'warning-supabase-unavailable',
        status: 'failed',
        detail: 'Supabase에 취소 기록을 저장하지 못했습니다. (취소는 완료됨)',
      });
      return NextResponse.json(
        {
          success: true,
          checklist,
        },
        { status: 200 }
      );
    }

    // Step 4: Supabase에서 기존 결제 레코드 조회
    let paymentRecord: PaymentRecord | undefined;
    try {
      const { record, checklist: queryChecklist } = await queryPaymentRecord({
        supabase,
        transactionKey: data.transactionKey,
      });
      checklist.push(...queryChecklist);
      paymentRecord = record;
    } catch (error) {
      // 레코드 조회 실패해도 경고만
      checklist.push({
        step: 'warning-query-record-failed',
        status: 'failed',
        detail:
          error instanceof Error
            ? error.message
            : '결제 레코드를 찾을 수 없습니다. (취소는 완료됨)',
      });
      return NextResponse.json(
        {
          success: true,
          checklist,
        },
        { status: 200 }
      );
    }

    // Step 5: 취소 레코드는 PortOne webhook(/api/portone)에서 처리됨
    checklist.push({
      step: 'cancellation-flow-initiated',
      status: 'passed',
      detail: '취소 요청 완료. 취소 레코드는 webhook에서 저장됩니다.',
    });

    // Step 6: PortOne 예약 결제 조회 및 삭제
    if (paymentDetail?.billingKey && paymentRecord) {
      try {
        const fromDate = new Date(paymentRecord.next_schedule_at);
        fromDate.setDate(fromDate.getDate() - 1);
        const untilDate = new Date(paymentRecord.next_schedule_at);
        untilDate.setDate(untilDate.getDate() + 1);

        const { items, checklist: scheduleQueryChecklist } =
          await queryScheduledPayments({
            secret,
            billingKey: paymentDetail.billingKey,
            fromDate: fromDate.toISOString(),
            untilDate: untilDate.toISOString(),
          });
        checklist.push(...scheduleQueryChecklist);

        // 일치하는 예약 결제 찾기
        const matchingSchedule = items?.find(
          (item) => item.paymentId === paymentRecord.next_schedule_id
        );

        if (matchingSchedule) {
          checklist.push({
            step: 'find-matching-schedule',
            status: 'passed',
            detail: `예약 결제 ID 발견: ${matchingSchedule.id}`,
          });

          // 예약 결제 삭제
          const deleteChecklist = await deleteScheduledPayments({
            secret,
            scheduleIds: [matchingSchedule.id],
          });
          checklist.push(...deleteChecklist);
        } else {
          checklist.push({
            step: 'find-matching-schedule',
            status: 'failed',
            detail: '일치하는 예약 결제를 찾을 수 없습니다. (취소는 완료됨)',
          });
        }
      } catch (error) {
        // 예약 결제 삭제 실패해도 경고만
        checklist.push({
          step: 'warning-schedule-deletion-failed',
          status: 'failed',
          detail:
            error instanceof Error
              ? error.message
              : '예약 결제 삭제에 실패했습니다. (취소는 완료됨)',
        });
      }
    }

    checklist.push({
      step: 'complete-cancel-flow',
      status: 'passed',
      detail: '구독 취소 처리 완료',
    });

    console.log(`🔴 [CANCEL ${cancelId}] 구독 취소 완료 - 성공 응답 반환`);
    return NextResponse.json(
      {
        success: true,
        checklist,
      },
      { status: 200 }
    );
  } catch (error) {
    checklist.push({
      step: 'handle-unexpected-error',
      status: 'failed',
      detail:
        error instanceof Error
          ? error.message
          : '예상치 못한 오류가 발생했습니다.',
    });

    return NextResponse.json(
      {
        success: false,
        error: '서버 내부 오류가 발생했습니다.',
        checklist,
      },
      { status: 500 }
    );
  }
}
