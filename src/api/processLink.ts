import axios, { AxiosError } from 'axios';
import type { ProcessLinkResponse } from '@/store/types';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? '';

export class ProcessLinkError extends Error {
  status: number;
  unsupported: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ProcessLinkError';
    this.status = status;
    this.unsupported = status === 501;
  }
}

/**
 * POST {BACKEND_URL}/api/process-link  { url }
 * 200 → { platform, summary, keyTakeaways, todos, toolsMentioned,
 *         category, transcriptAvailable }
 * 501 → platform not supported (surfaced as ProcessLinkError.unsupported)
 * other 4xx/5xx → { error: string }
 */
export async function processLink(url: string): Promise<ProcessLinkResponse> {
  if (!BASE_URL) {
    throw new ProcessLinkError('EXPO_PUBLIC_BACKEND_URL is not configured', 0);
  }

  try {
    const res = await axios.post<ProcessLinkResponse>(
      `${BASE_URL}/api/process-link`,
      { url },
      { headers: { 'Content-Type': 'application/json' }, timeout: 60000 }
    );
    return {
      platform: res.data.platform ?? 'unknown',
      summary: res.data.summary ?? '',
      keyTakeaways: res.data.keyTakeaways ?? [],
      todos: res.data.todos ?? [],
      toolsMentioned: res.data.toolsMentioned ?? [],
      category: res.data.category ?? 'Unsorted',
      transcriptAvailable: res.data.transcriptAvailable ?? false,
    };
  } catch (e) {
    const err = e as AxiosError<{ error?: string }>;
    if (err.response) {
      throw new ProcessLinkError(
        err.response.data?.error ?? `Backend returned ${err.response.status}`,
        err.response.status
      );
    }
    throw new ProcessLinkError(err.message ?? 'Network error', 0);
  }
}
