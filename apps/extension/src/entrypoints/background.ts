import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { createBrainClient } from '@germanio/client';
import type { Message, Status } from '../lib/messages';

const brain = createBrainClient();

async function handle(msg: Message): Promise<unknown> {
  try {
    switch (msg.type) {
      case 'lookup':
        return await brain.lookup(msg.q);
      case 'mine':
        return await brain.mine(msg.req);
      case 'time':
        await brain.logTime(msg.entry);
        return { ok: true };
      case 'status': {
        const t = await brain.today();
        return { online: true, dueCount: t.dueCount, newRemaining: t.newRemaining, todayHours: t.todayHours } satisfies Status;
      }
    }
  } catch (e) {
    if (msg.type === 'status') return { online: false, dueCount: 0, newRemaining: 0, todayHours: 0 } satisfies Status;
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((msg: unknown) => handle(msg as Message));

  // Alt+Shift+D: look up the current selection in the active tab.
  browser.commands.onCommand.addListener(async (command) => {
    if (command !== 'lookup-selection') return;
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) await browser.tabs.sendMessage(tab.id, { type: 'lookup-selection' }).catch(() => {});
  });

  // Badge = cards due, refreshed every few minutes.
  const refreshBadge = async () => {
    const s = (await handle({ type: 'status' })) as Status;
    const action = browser.action ?? browser.browserAction;
    await action.setBadgeBackgroundColor({ color: '#0e0e10' });
    await action.setBadgeText({ text: s.online ? (s.dueCount > 0 ? String(Math.min(s.dueCount, 999)) : '') : '!' });
  };
  void refreshBadge();
  setInterval(() => void refreshBadge(), 5 * 60_000);
});
