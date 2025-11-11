import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

type SubscriptionRequestBody = {
  payment_id: string;
  status: 'Paid' | 'Cancelled';
};

type ChecklistItem = {
  step: string;
  status: 'passed' | 'failed' | 'skipped';
  detail: string;
};

type ApiSuccessResponse = {
  success: true;
  checklist: ChecklistItem[];
};

type ApiErrorResponse = {
  success: false;
  error: string;
  checklist: ChecklistItem[];
};

type ApiResponse = ApiSuccessResponse | ApiErrorResponse;

type PortonePaymentResponse = {
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

const PORTONE_API_BASE_URL = 'https://api.portone.io';

function validateRequestBody(body: unknown): {
  data?: SubscriptionRequestBody & { paymentId: string };
  checklist: ChecklistItem[];
  error?: string;
} {
  const checklist: ChecklistItem[] = [];

  if (typeof body !== 'object' || body === null) {
    const detail = '요청 본문이 객체 형식이 아닙니다.';
    checklist.push({
      step: 'validate-request-body',
      status: 'failed',
      detail,
    });
    return { error: detail, checklist };
  }

  const { payment_id, status } = body as Record<string, unknown>;

  if (typeof payment_id !== 'string' || payment_id.trim() === '') {
    const detail = 'payment_id 값이 유효한 문자열이어야 합니다.';
    checklist.push({
      step: 'validate-payment-id',
      status: 'failed',
      detail,
    });
    return { error: detail, checklist };
  }

  if (status !== 'Paid' && status !== 'Cancelled') {
    const detail = 'status 값은 "Paid" 또는 "Cancelled" 이어야 합니다.';
    checklist.push({
      step: 'validate-status',
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
      payment_id: payment_id.trim(),
      paymentId: payment_id.trim(),
      status,
    },
    checklist,
  };
}

async function fetchPortonePaymentDetail(
  paymentId: string,
  secret: string
): Promise<{
  detail?: PortonePaymentResponse;
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

  console.log('------거래 내역 상세 response------', response);

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

  const detail = (await safeParseJson(
    response
  )) as PortonePaymentResponse | null;
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

async function insertPaymentRecord(args: {
  supabase: SupabaseClient;
  paymentId: string;
  amount: number;
  startAt: string;
  endAt: string;
  endGraceAt: string;
  nextScheduleAt: string;
  nextScheduleId: string;
}): Promise<ChecklistItem[]> {
  const {
    supabase,
    paymentId,
    amount,
    startAt,
    endAt,
    endGraceAt,
    nextScheduleAt,
    nextScheduleId,
  } = args;
  const checklist: ChecklistItem[] = [];

  const paymentData = {
    transaction_key: paymentId,
    amount,
    status: 'Paid',
    start_at: startAt,
    end_at: endAt,
    end_grace_at: endGraceAt,
    next_schedule_at: nextScheduleAt,
    next_schedule_id: nextScheduleId,
  };

  console.log('💾 [WEBHOOK] Supabase payment 저장 시도:', paymentData);

  const { error } = await supabase.from('payment').insert(paymentData);

  if (error) {
    console.error('❌ [WEBHOOK] Supabase payment 저장 실패:', error);
    const detail = `Supabase payment 등록 실패: ${error.message}`;
    checklist.push({
      step: 'insert-payment-record',
      status: 'failed',
      detail,
    });
    throw new Error(detail);
  }

  console.log('✅ [WEBHOOK] Supabase payment 저장 성공');
  checklist.push({
    step: 'insert-payment-record',
    status: 'passed',
    detail: 'Supabase payment 테이블 등록 성공',
  });

  return checklist;
}

async function scheduleNextSubscription(args: {
  secret: string;
  nextScheduleId: string;
  nextScheduleAt: string;
  paymentDetail: PortonePaymentResponse;
}): Promise<ChecklistItem[]> {
  const { secret, nextScheduleId, nextScheduleAt, paymentDetail } = args;
  const checklist: ChecklistItem[] = [];

  const response = await fetch(
    `${PORTONE_API_BASE_URL}/payments/${encodeURIComponent(
      nextScheduleId
    )}/schedule`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `PortOne ${secret}`,
      },
      body: JSON.stringify({
        payment: {
          billingKey: paymentDetail.billingKey,
          orderName: paymentDetail.orderName,
          customer: {
            id: paymentDetail.customer?.id,
          },
          amount: {
            total: paymentDetail.amount?.total,
          },
          currency: 'KRW',
        },
        timeToPay: nextScheduleAt,
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await safeParseJson(response);
    const detail = `PortOne 구독 예약 실패 (${response.status}): ${
      typeof errorBody === 'object' && errorBody !== null
        ? JSON.stringify(errorBody)
        : response.statusText
    }`;
    checklist.push({
      step: 'schedule-next-subscription',
      status: 'failed',
      detail,
    });
    throw new Error(detail);
  }

  checklist.push({
    step: 'schedule-next-subscription',
    status: 'passed',
    detail: 'PortOne 다음달 구독 결제 예약 성공',
  });

  return checklist;
}

async function safeParseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function buildDateStrings(): {
  startAt: string;
  endAt: string;
  endGraceAt: string;
  nextScheduleAt: string;
} {
  const now = new Date();
  const startAt = now.toISOString();

  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 30);
  const endAt = endDate.toISOString();

  const endGraceDate = new Date(endDate);
  endGraceDate.setDate(endGraceDate.getDate() + 1);
  const endGraceAt = endGraceDate.toISOString();

  const nextScheduleDate = new Date(endDate);
  nextScheduleDate.setDate(nextScheduleDate.getDate() + 1);
  nextScheduleDate.setHours(10, Math.floor(Math.random() * 60), 0, 0);
  const nextScheduleAt = nextScheduleDate.toISOString();

  return { startAt, endAt, endGraceAt, nextScheduleAt };
}

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
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    const detail = `Supabase payment 조회 실패: ${
      error?.message || '레코드를 찾을 수 없습니다'
    }`;
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

  const cancelData = {
    transaction_key: record.transaction_key,
    amount: -record.amount,
    status: 'Cancel',
    start_at: record.start_at,
    end_at: record.end_at,
    end_grace_at: record.end_grace_at,
    next_schedule_at: record.next_schedule_at,
    next_schedule_id: record.next_schedule_id,
  };

  console.log('💾 [WEBHOOK] Supabase 취소 레코드 저장 시도:', cancelData);

  const { error } = await supabase.from('payment').insert(cancelData);

  if (error) {
    console.error('❌ [WEBHOOK] Supabase 취소 레코드 저장 실패:', error);
    const detail = `Supabase 취소 레코드 등록 실패: ${error.message}`;
    checklist.push({
      step: 'insert-cancellation-record',
      status: 'failed',
      detail,
    });
    throw new Error(detail);
  }

  console.log('✅ [WEBHOOK] Supabase 취소 레코드 저장 성공');
  checklist.push({
    step: 'insert-cancellation-record',
    status: 'passed',
    detail: 'Supabase 취소 레코드 등록 성공',
  });

  return checklist;
}

type ScheduledPayment = {
  id: string;
  paymentId: string;
};

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
        data: {
          filter: {
            billingKey,
            from: fromDate,
            until: untilDate,
          },
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
  billingKey: string;
}): Promise<ChecklistItem[]> {
  const { secret, scheduleIds, billingKey } = args;
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
          billingKey,
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
  const webhookId = crypto.randomUUID().substring(0, 8);
  console.log(`🟣 [WEBHOOK ${webhookId}] POST /api/portone 호출됨 (PortOne Webhook)`);

  const checklist: ChecklistItem[] = [];

  try {
    const body = await req.json();
    console.log(`🟣 [WEBHOOK ${webhookId}] 요청 본문:`, JSON.stringify(body, null, 2));
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

    let paymentDetail: PortonePaymentResponse | undefined;
    try {
      const { detail, checklist: fetchChecklist } =
        await fetchPortonePaymentDetail(data.paymentId, secret);
      checklist.push(...fetchChecklist);
      paymentDetail = detail;
      console.log('------paymentDetail------', paymentDetail);
    } catch (error) {
      checklist.push({
        step: 'handle-fetch-payment-error',
        status: 'failed',
        detail:
          error instanceof Error
            ? error.message
            : 'PortOne 결제 조회 중 오류가 발생했습니다.',
      });
      return NextResponse.json(
        {
          success: false,
          error: 'PortOne 결제 정보를 조회하지 못했습니다.',
          checklist,
        },
        { status: 502 }
      );
    }

    if (!paymentDetail) {
      const detail = 'PortOne 결제 정보를 확인하지 못했습니다.';
      checklist.push({
        step: 'validate-payment-detail-presence',
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

    const {
      client: supabase,
      checklist: supabaseChecklist,
      error: supabaseError,
    } = createSupabaseClient();
    checklist.push(...supabaseChecklist);
    if (!supabase || supabaseError) {
      return NextResponse.json(
        {
          success: false,
          error:
            supabaseError ?? 'Supabase 클라이언트를 초기화하지 못했습니다.',
          checklist,
        },
        { status: 500 }
      );
    }

    // Handle Cancelled scenario
    if (data.status === 'Cancelled') {
      try {
        // 3-1-2: Query existing payment record from Supabase
        const { record, checklist: queryChecklist } = await queryPaymentRecord({
          supabase,
          transactionKey: data.paymentId,
        });
        checklist.push(...queryChecklist);

        if (!record) {
          throw new Error('결제 레코드를 찾을 수 없습니다.');
        }

        // 3-1-3: Insert cancellation record
        const cancelChecklist = await insertCancellationRecord({
          supabase,
          record,
        });
        checklist.push(...cancelChecklist);

        // 3-2-1: Query scheduled payments
        const fromDate = new Date(record.next_schedule_at);
        fromDate.setDate(fromDate.getDate() - 1);
        const untilDate = new Date(record.next_schedule_at);
        untilDate.setDate(untilDate.getDate() + 1);

        const { items, checklist: scheduleQueryChecklist } =
          await queryScheduledPayments({
            secret,
            billingKey: paymentDetail.billingKey || '',
            fromDate: fromDate.toISOString(),
            untilDate: untilDate.toISOString(),
          });
        checklist.push(...scheduleQueryChecklist);

        // 3-2-2: Extract schedule ID
        const matchingSchedule = items?.find(
          (item) => item.paymentId === record.next_schedule_id
        );

        if (!matchingSchedule) {
          checklist.push({
            step: 'find-matching-schedule',
            status: 'failed',
            detail: '일치하는 예약 결제를 찾을 수 없습니다.',
          });
          throw new Error('일치하는 예약 결제를 찾을 수 없습니다.');
        }

        checklist.push({
          step: 'find-matching-schedule',
          status: 'passed',
          detail: `예약 결제 ID 발견: ${matchingSchedule.id}`,
        });

        // 3-2-3: Delete scheduled payment
        const deleteChecklist = await deleteScheduledPayments({
          secret,
          scheduleIds: [matchingSchedule.id],
          billingKey: paymentDetail.billingKey || '',
        });
        checklist.push(...deleteChecklist);

        checklist.push({
          step: 'complete-cancellation-flow',
          status: 'passed',
          detail: '구독 취소 처리 완료',
        });

        console.log(`🟣 [WEBHOOK ${webhookId}] 구독 취소 완료 - 성공 응답 반환`);
        return NextResponse.json(
          {
            success: true,
            checklist,
          },
          { status: 200 }
        );
      } catch (error) {
        console.log('------error------', error);
        checklist.push({
          step: 'handle-cancellation-error',
          status: 'failed',
          detail:
            error instanceof Error
              ? error.message
              : '구독 취소 처리 중 오류가 발생했습니다.',
        });
        return NextResponse.json(
          {
            success: false,
            error: '구독 취소를 처리하지 못했습니다.',
            checklist,
          },
          { status: 500 }
        );
      }
    }

    // Handle Paid scenario
    const amount = paymentDetail.amount?.total;
    if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
      const detail =
        'PortOne 결제 정보에서 유효한 결제 금액을 확인할 수 없습니다.';
      checklist.push({
        step: 'validate-payment-amount',
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

    if (
      !paymentDetail.billingKey ||
      !paymentDetail.orderName ||
      !paymentDetail.customer?.id ||
      paymentDetail.customer.id.trim() === ''
    ) {
      const detail =
        'PortOne 결제 정보에서 구독 예약에 필요한 필드를 확인할 수 없습니다.';
      checklist.push({
        step: 'validate-payment-detail',
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

    const { startAt, endAt, endGraceAt, nextScheduleAt } = buildDateStrings();
    const nextScheduleId = crypto.randomUUID();

    try {
      const supabaseInsertChecklist = await insertPaymentRecord({
        supabase,
        paymentId: data.paymentId,
        amount,
        startAt,
        endAt,
        endGraceAt,
        nextScheduleAt,
        nextScheduleId,
      });
      checklist.push(...supabaseInsertChecklist);
    } catch (error) {
      checklist.push({
        step: 'handle-supabase-error',
        status: 'failed',
        detail:
          error instanceof Error
            ? error.message
            : 'Supabase 처리 중 오류가 발생했습니다.',
      });
      return NextResponse.json(
        {
          success: false,
          error: '결제 정보를 저장하지 못했습니다.',
          checklist,
        },
        { status: 500 }
      );
    }

    try {
      const scheduleChecklist = await scheduleNextSubscription({
        secret,
        nextScheduleId,
        nextScheduleAt,
        paymentDetail,
      });
      checklist.push(...scheduleChecklist);
    } catch (error) {
      checklist.push({
        step: 'handle-schedule-error',
        status: 'failed',
        detail:
          error instanceof Error
            ? error.message
            : '구독 결제 예약 처리 중 오류가 발생했습니다.',
      });
      return NextResponse.json(
        {
          success: false,
          error: '다음 구독 결제를 예약하지 못했습니다.',
          checklist,
        },
        { status: 502 }
      );
    }

    checklist.push({
      step: 'complete-subscription-flow',
      status: 'passed',
      detail: '구독 결제 완료 및 다음 결제 예약 처리 완료',
    });

    console.log(`🟣 [WEBHOOK ${webhookId}] 구독 결제 완료 - 성공 응답 반환`);
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
