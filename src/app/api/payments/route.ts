import { NextRequest, NextResponse } from 'next/server';

type PaymentRequestBody = {
  billingKey: string;
  orderName: string;
  amount: number;
  customer: {
    id: string;
  };
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
  `${PORTONE_API_BASE_URL}/payments/${encodeURIComponent(paymentId)}/billing-key`;

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

  const { billingKey, orderName, amount, customer } = body as Record<string, unknown>;

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

  if (typeof customer !== 'object' || customer === null || typeof (customer as Record<string, unknown>).id !== 'string' || (customer as Record<string, unknown>).id === '') {
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
    },
    checklist,
  };
}

async function requestPortoneBillingKeyPayment(args: {
  paymentId: string;
  payload: PaymentRequestBody;
  secret: string;
}): Promise<{ checklist: ChecklistItem[] }> {
  const { paymentId, payload, secret } = args;
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
      currency: 'KRW',
    }),
  });

  if (!response.ok) {
    const errorBody = await safeParseJson(response);
    const detail = `PortOne API 호출 실패 (${response.status}): ${
      typeof errorBody === 'object' && errorBody !== null ? JSON.stringify(errorBody) : response.statusText
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

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const checklist: ChecklistItem[] = [];

  try {
    const body = await req.json();
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
        { status: 400 },
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
        { status: 500 },
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
      const { checklist: portoneChecklist } = await requestPortoneBillingKeyPayment({
        paymentId,
        payload: data,
        secret,
      });
      checklist.push(...portoneChecklist);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'PortOne 결제 요청 중 오류가 발생했습니다.',
          checklist,
        },
        { status: 502 },
      );
    }

    checklist.push({
      step: 'skip-database-persistence',
      status: 'passed',
      detail: 'DB 저장 없이 PortOne 응답 결과만 반환',
    });

    return NextResponse.json(
      {
        success: true,
        paymentId,
        checklist,
      },
      { status: 200 },
    );
  } catch (error) {
    checklist.push({
      step: 'handle-unexpected-error',
      status: 'failed',
      detail: error instanceof Error ? error.message : '예상치 못한 오류가 발생했습니다.',
    });

    return NextResponse.json(
      {
        success: false,
        error: '서버 내부 오류가 발생했습니다.',
        checklist,
      },
      { status: 500 },
    );
  }
}
