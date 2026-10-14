import { defineStrings } from '@germanio/i18n-adaptive';

/**
 * Every UI string, bound to the lemmas that unlock its German form.
 * Keep German natural and short — these strings are the learner's first reading.
 */
export const strings = defineStrings({
  'nav.heute': { de: 'Heute', en: 'Today', fa: 'امروز', lemmas: ['heute'] },
  'nav.wortschatz': { de: 'Wortschatz', en: 'Vocabulary', fa: 'واژگان', lemmas: ['Wortschatz'] },
  'nav.lesesaal': { de: 'Lesesaal', en: 'Reading room', fa: 'قرائت‌خانه', lemmas: ['Lesesaal'] },
  'nav.schreiben': { de: 'Schreiben', en: 'Writing', fa: 'نوشتن', lemmas: ['schreiben'] },
  'nav.grammatik': { de: 'Grammatik', en: 'Grammar', fa: 'دستور زبان', lemmas: ['Grammatik'] },
  'nav.sprachgrenze': { de: 'Sprachgrenze', en: 'Language frontier', fa: 'مرز زبان', lemmas: ['Sprache', 'Grenze'] },

  'heute.title': { de: 'Dein Tag', en: 'Your day', fa: 'روز تو', lemmas: ['dein', 'Tag'] },
  'heute.plan': { de: 'Plan für heute', en: "Today's plan", fa: 'برنامهٔ امروز', lemmas: ['Plan', 'für', 'heute'] },
  'heute.start': { de: 'Jetzt anfangen', en: 'Start now', fa: 'همین حالا شروع کن', lemmas: ['jetzt', 'anfangen'] },
  'heute.hours': { de: 'Stunden heute', en: 'Hours today', fa: 'ساعت‌های امروز', lemmas: ['Stunde', 'heute'] },
  'heute.due': { de: 'Fällige Karten', en: 'Cards due', fa: 'کارت‌های مرور', lemmas: ['fällig', 'Karte'] },
  'heute.new': { de: 'Neue Wörter', en: 'New words', fa: 'واژه‌های تازه', lemmas: ['neu', 'Wort'] },
  'heute.forecast': { de: 'Prognose', en: 'Forecast', fa: 'پیش‌بینی', lemmas: ['Prognose'] },
  'heute.weak': { de: 'Deine Baustellen', en: 'Your weak spots', fa: 'نقاط ضعف تو', lemmas: ['dein', 'Baustelle'] },

  'block.review': { de: 'Wiederholen', en: 'Review', fa: 'مرور', lemmas: ['wiederholen'] },
  'block.new-words': { de: 'Neue Wörter', en: 'New words', fa: 'واژه‌های تازه', lemmas: ['neu', 'Wort'] },
  'block.lesen': { de: 'Lesen', en: 'Reading', fa: 'خواندن', lemmas: ['lesen'] },
  'block.hoeren': { de: 'Hören', en: 'Listening', fa: 'شنیدن', lemmas: ['hören'] },
  'block.schreiben': { de: 'Schreiben', en: 'Writing', fa: 'نوشتن', lemmas: ['schreiben'] },
  'block.sprechen': { de: 'Sprechen', en: 'Speaking', fa: 'صحبت کردن', lemmas: ['sprechen'] },
  'block.grammatik': { de: 'Grammatik', en: 'Grammar', fa: 'دستور زبان', lemmas: ['Grammatik'] },

  'principle.spaced-retrieval': { de: 'Abruf mit Abstand', en: 'Spaced retrieval', fa: 'یادآوری با فاصله', lemmas: ['Abruf', 'mit', 'Abstand'] },
  'principle.comprehensible-input': { de: 'Verständlicher Input', en: 'Comprehensible input', fa: 'ورودی قابل فهم', lemmas: ['verständlich', 'Input'] },
  'principle.output-hypothesis': { de: 'Selbst produzieren', en: 'Output hypothesis', fa: 'تولید فعال زبان', lemmas: ['selbst', 'produzieren'] },
  'principle.noticing': { de: 'Bewusst bemerken', en: 'Noticing', fa: 'توجه آگاهانه', lemmas: ['bewusst', 'bemerken'] },
  'principle.interleaving': { de: 'Mischen', en: 'Interleaving', fa: 'درهم‌آمیزی', lemmas: ['mischen'] },

  'review.show': { de: 'Antwort zeigen', en: 'Show answer', fa: 'نمایش پاسخ', lemmas: ['Antwort', 'zeigen'] },
  'review.again': { de: 'Nochmal', en: 'Again', fa: 'دوباره', lemmas: ['nochmal'] },
  'review.hard': { de: 'Schwer', en: 'Hard', fa: 'سخت', lemmas: ['schwer'] },
  'review.good': { de: 'Gut', en: 'Good', fa: 'خوب', lemmas: ['gut'] },
  'review.easy': { de: 'Leicht', en: 'Easy', fa: 'آسان', lemmas: ['leicht'] },
  'review.done': { de: 'Fertig für jetzt', en: 'Done for now', fa: 'فعلاً تمام شد', lemmas: ['fertig', 'für', 'jetzt'] },
  'review.genusPrompt': { de: 'Welcher Artikel?', en: 'Which article?', fa: 'کدام حرف تعریف؟', lemmas: ['welcher', 'Artikel'] },

  'lookup.placeholder': { de: 'Wort suchen …', en: 'Search a word …', fa: 'جست‌وجوی واژه …', lemmas: ['Wort', 'suchen'] },
  'lookup.mine': { de: 'Lernen', en: 'Learn this', fa: 'یادش بگیر', lemmas: ['lernen'] },
  'lookup.known': { de: 'Schon bekannt', en: 'Already known', fa: 'از قبل بلدی', lemmas: ['schon', 'bekannt'] },

  'brain.offline': { de: 'Gehirn offline', en: 'Brain offline', fa: 'مغز خاموش است', lemmas: ['Gehirn', 'offline'] },
  'ui.german': { de: 'Deutsch', en: 'German', fa: 'آلمانی', lemmas: ['Deutsch'] },
});

export type StringKey = keyof typeof strings;
