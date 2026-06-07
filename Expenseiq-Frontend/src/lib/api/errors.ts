// Typed error class for everything the API client surfaces. The wrapper
// throws this for any non-2xx response so callers can branch on .status
// instead of parsing string messages. The backend's wire shape is always
// `{ error: <message> }` (Phase 2 errorHandler) — captured in .body.

export interface ApiErrorBody {
  error?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly url: string;
  readonly body: ApiErrorBody | undefined;

  constructor(status: number, url: string, message: string, body?: ApiErrorBody) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.url = url;
    this.body = body;
  }

  static async fromResponse(res: Response): Promise<ApiError> {
    let body: ApiErrorBody | undefined;
    let message = `${res.status} ${res.statusText || 'Request failed'}`;
    try {
      body = (await res.json()) as ApiErrorBody;
      if (body && typeof body.error === 'string' && body.error) {
        message = body.error;
      }
    } catch {
      // body wasn't JSON; keep the status-line message
    }
    return new ApiError(res.status, res.url, message, body);
  }
}
