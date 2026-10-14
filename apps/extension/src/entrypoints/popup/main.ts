import { browser } from 'wxt/browser';
import type { Status } from '../../lib/messages';

const $ = (id: string) => document.getElementById(id)!;

const s = (await browser.runtime.sendMessage({ type: 'status' })) as Status;
$('state').textContent = s.online ? 'Gehirn online' : 'Gehirn offline';
if (s.online) {
  $('due').textContent = String(s.dueCount);
  $('new').textContent = String(s.newRemaining);
  $('hours').textContent = s.todayHours.toFixed(1);
}
