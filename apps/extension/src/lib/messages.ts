import type { LookupResponse, MineResponse } from '@germanio/client';
import type { MineRequest, TimeLog } from '@germanio/core';

/**
 * Content scripts run with the *page's* origin, which brain rejects on purpose.
 * So every brain call is relayed through the background script, whose origin
 * is moz-extension://… and allowed.
 */
export type Message =
  | { type: 'lookup'; q: string }
  | { type: 'mine'; req: MineRequest }
  | { type: 'time'; entry: TimeLog }
  | { type: 'status' };

export interface Status {
  online: boolean;
  dueCount: number;
  newRemaining: number;
  todayHours: number;
}

export type Reply<M extends Message> = M extends { type: 'lookup' }
  ? LookupResponse | { error: string }
  : M extends { type: 'mine' }
    ? MineResponse | { error: string }
    : M extends { type: 'status' }
      ? Status
      : { ok: boolean };
