import { NextRequest, NextResponse } from 'next/server';
import { SupabaseClient, createClient } from '@supabase/supabase-js';

// Force Node.js runtime (not Edge)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PaymentRequestBody = {
  billingKey: string;
  orderName: string;
  amount: number;
  customer: {
    id: string;
  };
  customData?: string;
};

type ChecklistItem = {
  step: string;
  status: 'passed' | 'failed';
  detail: string;
};

type ApiResponse =
  | {
      success: true;
      paymentId: string;
      checklist: ChecklistItem[];
    }
  | {
      success: false;
      error: string;
      checklist: ChecklistItem[];
    };

const PORTONE_API_BASE_URL = 'https://api.portone.io';
const PORTONE_BILLING_KEY_PATH = (paymentId: string) =>
  `${PORTONE_API_BASE_URL}/payments/${encodeURIComponent(
    paymentId
  )}/billing-key`;
const PORTONE_SCHEDULE_PATH = (paymentId: string) =>
  `${PORTONE_API_BASE_URL}/payments/${encodeURIComponent(paymentId)}/schedule`;

function validateRequestBody(body: unknown): {
  data?: PaymentRequestBody;
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

  const { billingKey, orderName, amount, customer, customData } = body as Record<
    string,
    unknown
  >;

  if (typeof billingKey !== 'string' || billingKey.trim() === '') {
    const detail = 'billingKey 값이 유효한 문자열이어야 합니다.';
    checklist.push({
      step: 'validate-billing-key',
      status: 'failed',
      detail,
    });
    return { error: detail, checklist };
  }

  if (typeof orderName !== 'string' || orderName.trim() === '') {
    const detail = 'orderName 값이 유효한 문자열이어야 합니다.';
    checklist.push({
      step: 'validate-order-name',
      status: 'failed',
      detail,
    });
    return { error: detail, checklist };
  }

  if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
    const detail = 'amount 값은 0보다 큰 숫자여야 합니다.';
    checklist.push({
      step: 'validate-amount',
      status: 'failed',
      detail,
    });
    return { error: detail, checklist };
  }

  if (
    typeof customer !== 'object' ||
    customer === null ||
    typeof (customer as Record<string, unknown>).id !== 'string' ||
    (customer as Record<string, unknown>).id === ''
  ) {
    const detail = 'customer.id 값이 유효한 문자열이어야 합니다.';
    checklist.push({
      step: 'validate-customer',
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
      billingKey: billingKey.trim(),
      orderName: orderName.trim(),
      amount,
      customer: {
        id: (customer as { id: string }).id.trim(),
      },
      customData: typeof customData === 'string' ? customData : undefined,
    },
    checklist,
  };
}

async function requestPortoneBillingKeyPayment(args: {
  paymentId: string;
  payload: PaymentRequestBody;
  secret: string;
  userId: string;
}): Promise<{ checklist: ChecklistItem[] }> {
  const { paymentId, payload, secret, userId } = args;
  const checklist: ChecklistItem[] = [];

  const response = await fetch(PORTONE_BILLING_KEY_PATH(paymentId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `PortOne ${secret}`,
    },
    body: JSON.stringify({
      billingKey: payload.billingKey,
      orderName: payload.orderName,
      amount: {
        total: payload.amount,
      },
      customer: {
        id: payload.customer.id,
      },
      customData: payload.customData || userId,
      currency: 'KRW',
    }),
  });

  if (!response.ok) {
    const errorBody = await safeParseJson(response);
    const detail = `PortOne API 호출 실패 (${response.status}): ${
      typeof errorBody === 'object' && errorBody !== null
        ? JSON.stringify(errorBody)
        : response.statusText
    }`;
    checklist.push({
      step: 'request-portone-payment',
      status: 'failed',
      detail,
    });
    throw new Error(detail);
  }

  checklist.push({
    step: 'request-portone-payment',
    status: 'passed',
    detail: 'PortOne billing-key 결제 요청 성공',
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

async function getAuthenticatedUser(
  req: NextRequest
): Promise<{
  userId?: string;
  checklist: ChecklistItem[];
  error?: string;
}> {
  const checklist: ChecklistItem[] = [];
  const authHeader = req.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const detail = 'Authorization 헤더가 없거나 형식이 올바르지 않습니다.';
    checklist.push({
      step: 'authenticate-user',
      status: 'failed',
      detail,
    });
    return { error: detail, checklist };
  }

  const token = authHeader.substring(7);
  const {
    client: supabase,
    checklist: supabaseChecklist,
    error: supabaseError,
  } = createSupabaseClient();
  checklist.push(...supabaseChecklist);

  if (!supabase || supabaseError) {
    const detail = 'Supabase 클라이언트 초기화 실패';
    checklist.push({
      step: 'authenticate-user',
      status: 'failed',
      detail,
    });
    return { error: detail, checklist };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    const detail = `인증 실패: ${authError?.message || '사용자를 찾을 수 없습니다'}`;
    checklist.push({
      step: 'authenticate-user',
      status: 'failed',
      detail,
    });
    return { error: detail, checklist };
  }

  checklist.push({
    step: 'authenticate-user',
    status: 'passed',
    detail: '사용자 인증 성공',
  });

  return { userId: user.id, checklist };
}

async function createSchedule(args: {
  paymentId: string;
  billingKey: string;
  payload: PaymentRequestBody;
  secret: string;
  startDate: Date;
}): Promise<{ checklist: ChecklistItem[] }> {
  const { paymentId, billingKey, payload, secret, startDate } = args;
  const checklist: ChecklistItem[] = [];

  const requestBody = {
    payment: {
      billingKey,
      orderName: payload.orderName,
      amount: {
        total: payload.amount,
      },
      currency: 'KRW',
      customer: {
        id: payload.customer.id,
      },
    },
    timeToPay: startDate.toISOString(),
  };

  console.log('📅 스케줄 생성 요청:', JSON.stringify(requestBody, null, 2));

  const response = await fetch(PORTONE_SCHEDULE_PATH(paymentId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `PortOne ${secret}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorBody = await safeParseJson(response);
    const detail = `PortOne 스케줄 생성 실패 (${response.status}): ${
      typeof errorBody === 'object' && errorBody !== null
        ? JSON.stringify(errorBody)
        : response.statusText
    }`;
    checklist.push({
      step: 'create-schedule',
      status: 'failed',
      detail,
    });
    throw new Error(detail);
  }

  checklist.push({
    step: 'create-schedule',
    status: 'passed',
    detail: '정기 결제 스케줄 생성 완료',
  });

  return { checklist };
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse>> {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`🟢 [SERVER ${requestId}] POST /api/payments 호출됨`);

  const checklist: ChecklistItem[] = [];

  try {
    const body = await req.json();
    console.log(`🟢 [SERVER ${requestId}] 요청 본문:`, JSON.stringify(body, null, 2));
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

    // Step 1: 인가 확인
    const {
      userId,
      checklist: authChecklist,
      error: authError,
    } = await getAuthenticatedUser(req);
    checklist.push(...authChecklist);

    if (!userId || authError) {
      return NextResponse.json(
        {
          success: false,
          error: authError ?? '인가에 실패했습니다.',
          checklist,
        },
        { status: 401 }
      );
    }

    // Step 2: 결제가능여부 검증
    if (userId !== data.customer.id) {
      const detail = '인가된 user_id와 customer.id가 일치하지 않습니다.';
      checklist.push({
        step: 'validate-payment-authorization',
        status: 'failed',
        detail,
      });
      return NextResponse.json(
        {
          success: false,
          error: detail,
          checklist,
        },
        { status: 403 }
      );
    }

    checklist.push({
      step: 'validate-payment-authorization',
      status: 'passed',
      detail: '결제 가능 여부 검증 완료',
    });

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

    const paymentId = crypto.randomUUID();
    checklist.push({
      step: 'generate-payment-id',
      status: 'passed',
      detail: `결제 ID 생성: ${paymentId}`,
    });

    try {
      const { checklist: portoneChecklist } =
        await requestPortoneBillingKeyPayment({
          paymentId,
          payload: data,
          secret,
          userId,
        });
      checklist.push(...portoneChecklist);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'PortOne 결제 요청 중 오류가 발생했습니다.',
          checklist,
        },
        { status: 502 }
      );
    }

    // 정기 결제 스케줄 생성 (다음 달부터 자동 결제)
    const now = new Date();
    const oneMonthLater = new Date(now);
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

    const nextSchedulePaymentId = crypto.randomUUID();

    try {
      const { checklist: scheduleChecklist } = await createSchedule({
        paymentId: nextSchedulePaymentId,
        billingKey: data.billingKey,
        payload: data,
        secret,
        startDate: oneMonthLater,
      });
      checklist.push(...scheduleChecklist);
    } catch (error) {
      console.error('❌ 스케줄 생성 실패:', error);
      // 스케줄 생성 실패는 경고만 하고 계속 진행 (첫 결제는 성공했으므로)
      checklist.push({
        step: 'create-schedule',
        status: 'failed',
        detail: error instanceof Error ? error.message : '스케줄 생성 실패',
      });
    }

    // Supabase 저장은 PortOne webhook(/api/portone)에서 처리됨
    console.log(`ℹ️ [SERVER ${requestId}] Supabase 저장은 webhook에서 처리됩니다.`);
    checklist.push({
      step: 'payment-flow-complete',
      status: 'passed',
      detail: '결제 요청 완료. 결제 정보는 webhook에서 저장됩니다.',
    });

    console.log(`🟢 [SERVER ${requestId}] 성공 응답 반환`);
    return NextResponse.json(
      {
        success: true,
        paymentId,
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
