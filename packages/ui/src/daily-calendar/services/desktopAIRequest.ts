export interface AIJsonResponse<T> {
  ok: boolean;
  status: number;
  data: T;
}

interface DesktopAIBridge {
  request<T>(payload: {
    endpoint: string;
    apiKey: string;
    body: unknown;
    multipart?: {
      imageDataUrl: string;
      imageField?: string;
      filename?: string;
    };
  }): Promise<AIJsonResponse<T>>;
  generateCalendarPlan<T>(payload: {
    provider: string;
    apiEndpoint: string;
    apiKey: string;
    model: string;
    system: string;
    prompt: string;
  }): Promise<{
    ok: boolean;
    data?: T;
    error?: string;
  }>;
}

export async function requestCalendarCreativePlan<T>(payload: {
  provider: string;
  apiEndpoint: string;
  apiKey: string;
  model: string;
  system: string;
  prompt: string;
}): Promise<{ ok: boolean; data?: T; error?: string } | null> {
  const desktopBridge = typeof window !== 'undefined'
    ? (window as unknown as {
        calendarDesktop?: { ai?: DesktopAIBridge };
      }).calendarDesktop?.ai
    : undefined;

  if (!desktopBridge?.generateCalendarPlan) {
    return null;
  }

  return desktopBridge.generateCalendarPlan<T>(payload);
}

export async function requestAIJson<T>(
  endpoint: string,
  apiKey: string,
  body: unknown,
  multipart?: {
    imageDataUrl: string;
    imageField?: string;
    filename?: string;
  }
): Promise<AIJsonResponse<T>> {
  const desktopBridge = typeof window !== 'undefined'
    ? (window as unknown as {
        calendarDesktop?: { ai?: DesktopAIBridge };
      }).calendarDesktop?.ai
    : undefined;

  if (desktopBridge) {
    return desktopBridge.request<T>({ endpoint, apiKey, body, multipart });
  }

  let requestBody: BodyInit;
  let headers: HeadersInit = {
    Authorization: `Bearer ${apiKey}`,
  };

  if (multipart) {
    const match = multipart.imageDataUrl.match(/^data:([^;,]+);base64,(.+)$/);
    if (!match) throw new Error('参考图片格式不正确');

    const bytes = Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0));
    const formData = new FormData();
    const fields = body && typeof body === 'object'
      ? body as Record<string, unknown>
      : {};
    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });
    formData.append(
      multipart.imageField || 'image',
      new Blob([bytes], { type: match[1] }),
      multipart.filename || 'reference.jpg'
    );
    requestBody = formData;
  } else {
    headers = {
      ...headers,
      'Content-Type': 'application/json',
    };
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: requestBody,
  });
  const data = await response.json().catch(() => ({} as T));

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}
