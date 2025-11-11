import { NextRequest, NextResponse } from 'next/server';

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

export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiResponse>> {
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

    checklist.push({
      step: 'complete-cancel-flow',
      status: 'passed',
      detail: '결제 취소 처리 완료 (DB 저장 없이 응답 반환)',
    });

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
