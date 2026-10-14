# Germanio — Die Grenzen meiner Sprache

> «Die Grenzen meiner Sprache bedeuten die Grenzen meiner Welt.» — Wittgenstein
> یک سیستم‌عامل شخصی برای یادگیری آلمانی که در تمام روزِ پشت کامپیوتر همراهت است، بدون کاغذ و قلم، و با تو رشد می‌کند.

## Context
- **پویا** حدود یک سال دیگر آوسبیلدونگ آلمان را شروع می‌کند. باید در کمتر از ۶ ماه (حداکثر ۹ ماه) از **A1 به B2 یا بالاتر** برسد.
- ابزارهای فعلی هر کدام فقط یک تکه را حل می‌کنند:
  - Anki فقط SRS است.
  - LingQ فقط خواندن را پوشش می‌دهد.
  - Duolingo سطحی است.
  - Language Reactor فقط زیرنویس می‌دهد.
  - ChatGPT هیچ حافظه‌ای از یادگیرنده ندارد.
- هدف این است که پروژه سه کار بکند:
  1. مشکل واقعی پویا را حل کند.
  2. پورتفولیوی فنی و فلسفی او را چند سطح بالا ببرد.
  3. ظاهری در سطح Awwwards داشته باشد.
- پوشه `Germanio` خالی است و پروژه از صفر ساخته می‌شود. ابزارهای نصب‌شده: Node 24، Python 3.13 و git.
- **تصمیم‌های گرفته‌شده:**
  - پلتفرم: وب‌اپ و افزونهٔ Chrome. در این نسخه به‌خاطر درخواست «کاملاً کامپیوتری» یک **همراه دسکتاپ** هم اضافه شده است.
  - هوش مصنوعی: **Codex با اشتراک ChatGPT**.
  - رشته‌ها: **هم Fachinformatiker و هم Mediengestalter**.
  - رابط کاربری: **آلمانی تدریجی**.
  - **صفر کاغذ و قلم.**

### واقعیت‌سنجی صادقانه
- رسیدن از A1 به B2 حدود **۶۰۰ تا ۷۰۰ ساعت** تماس مؤثر با زبان لازم دارد. برای ۶ ماه یعنی روزی حدود ۳.۵ ساعت.
- Germanio این ساعت‌ها را حذف نمی‌کند. کارش این است که:
  - ساعت‌هایی را که به‌هرحال پشت کامپیوتری به **ساعت آلمانی** تبدیل کند؛
  - هر دقیقهٔ تمرین فعال را روی ضعیف‌ترین نقطه بگذارد؛
  - همهٔ این ساعت‌ها را **خودکار بشمارد و تاریخ رسیدن به B2 را پیش‌بینی کند**.

---

## فلسفه (روایت پورتفولیو)
1. **Sprachgrenze**
   - واژگانت به شکل یک جهان سه‌بعدی نمایش داده می‌شود. هر کلمه‌ای که یاد بگیری، مرز این جهان را جلوتر می‌برد.
2. **رابطی که با تو یاد می‌گیرد**
   - هر متن رابط کاربری به لِم (lemma)های آلمانی‌اش وصل است.
   - وقتی آن لِم‌ها را واقعاً یاد بگیری، همان بخش از اپ برای همیشه آلمانی می‌شود.
3. **Ideal L2 Self (Dörnyei)**
   - انگیزهٔ پایدار از دیدنِ «خودِ آینده» می‌آید، نه از استریک.
   - Germanio خودِ آلمانی‌زبانِ آینده‌ات را **قابل شنیدن** می‌کند (بخش Zukunftsstimme را ببین).
4. **Ambient، نه App**
   - یادگیری جایی اتفاق می‌افتد که تو هستی: مرورگر، VS Code، ترمینال، ویندوز.
   - لازم نیست برای یادگیری «به اپ بروی».
5. **Local-first و صادق**
   - داده‌ها روی سیستم خودت می‌مانند.
   - الگوهای فریبنده ممنوع است. «ظرفیت امروز» جای عذاب وجدان را می‌گیرد.
   - پایهٔ علمی هر تمرین در خود اپ نمایش داده می‌شود.

## اصل «بدون کاغذ»
- **یادداشت:** نوشتن روی کاغذ حذف می‌شود و جایش **Zettelkasten** خودکار می‌آید (روش نیکلاس لومان، که خودش ایده‌ای آلمانی است).
  - هر تصحیح، هر قاعدهٔ گرامری و هر جمله‌ای که استخراج می‌کنی، یک «Zettel» با لینک دوطرفه می‌شود.
  - همهٔ این برگه‌ها در یک گراف قابل جست‌وجو هستند.
- **نوشتن:** فقط با تایپ انجام می‌شود.
  - مربی **QWERTZ** داری، چون در محل کار آلمانی همین کیبورد را خواهی داشت.
  - ورودی هوشمند Umlaut (`ae→ä`، `ss→ß`) فقط تا وقتی فعال است که QWERTZ را یاد نگرفته‌ای.
- **تمرین‌ها:** همه با کیبورد، صدا یا کلیک انجام می‌شوند. ابزار جانبی لازم نیست.
- **آزمون:** توصیه می‌شود آزمون **دیجیتالِ** Goethe B1/B2 رزرو شود (موقع اجرا باید بررسی شود که در مرکز آزمون انتخابی ارائه می‌شود یا نه). شبیه‌ساز Prüfung دقیقاً همان رابط تایپی را تمرین می‌دهد.

## پایهٔ علمی
| اصل | پیاده‌سازی |
|---|---|
| FSRS-5 spaced repetition | کتابخانهٔ `ts-fsrs`؛ کارت برای تشخیص، تولید، شنیداری، Genus، جمع و صرف |
| Comprehensible Input (i+1) | Lesesaal و «Geschichten aus deinem Wortschatz»: متن با ۹۵ تا ۹۸٪ کلمات آشنا |
| Sentence mining | استخراج از هر جا با یک کلید: وب، یوتیوب، هر اپ ویندوز، صدای سیستم |
| Output Hypothesis و Noticing | تصحیح نوشتار و گفتار با diff و طبقه‌بندی خطا |
| Knowledge Tracing (BKT) | Fehlerprofil روی گراف حدود ۱۲۰ مفهوم گرامری که برنامهٔ درسی را هدایت می‌کند |
| Interleaving و Retrieval | Session builder ترکیبی |
| Perceptual training | Vokal-Labor (نمودار F1/F2)، منحنی pitch و minimal pairs |
| Dual coding برای Genus | رنگ ثابت در کل سیستم: der = Kobalt، die = Zinnober، das = Moos |
| Diglot weave | جایگزینی تدریجی کلمه‌های انگلیسی با آلمانی در صفحه‌هایی که می‌خوانی |
| Ideal L2 Self | Zukunftsstimme |
| Narrative & social presence | دنیای «Neues Leben» و NPCهایی که حافظه دارند |

---

## ★ ویژگی‌های امضایی (چیزی که هیچ ابزار دیگری ندارد)

### 1. «Neues Leben» — شبیه‌سازی زندگی‌ات در آلمان
- یک دنیای روایی پیوسته که **مسیر واقعی تو را بازسازی می‌کند**:
  - آمدن به یک شهر (مثلاً Köln)؛
  - Anmeldung و پیدا کردن WG؛
  - Bewerbung و Vorstellungsgespräch؛
  - روز اول در شرکت و Berufsschule.
- فصل‌های داستان با رسیدن تو به هر سطح CEFR باز می‌شوند.
- **NPCها حافظهٔ ماندگار دارند** (در SQLite ذخیره می‌شود)، از جمله:
  - هم‌خانه‌ات Jonas؛
  - Ausbilderin تو Frau Weber؛
  - همکارت Lena، که طراح است.
- **Germanio Messenger:** این شخصیت‌ها در طول روز در زمان‌های واقعی به تو پیام می‌دهند.
  - نمونه: «Hey, kommst du heute Abend mit ins Kino?»
  - تو با تایپ یا ویس جواب می‌دهی.
  - خطاهایت بعداً به‌صورت محترمانه نشان داده می‌شوند.
- این مکالمه‌های ناهمزمان مشکل کندی Codex را هم حل می‌کنند، چون در پیام‌رسان انتظار چندثانیه‌ای طبیعی است.

### 2. Zukunftsstimme — صدای آیندهٔ تو
- با حدود ۳۰ ثانیه ضبط از صدای خودت، یک مدل محلی کلون صدا ساخته می‌شود (XTTS-v2 یا F5-TTS آلمانی، فقط برای استفادهٔ شخصی).
- بعد **صدای خودت را می‌شنوی که آلمانی را روان صحبت می‌کند.**
  - یعنی با صدای خودت shadowing می‌کنی.
  - جمله‌هایی را که امروز گفتی، با صدای خودت ولی بدون خطا می‌شنوی.
- پایهٔ روان‌شناختی‌اش self-modeling و نظریهٔ Ideal L2 Self است.
- اختیاری است. GPU بهتر است، ولی اجرا با CPU هم ممکن است.

### 3. Tagesfunk — پادکست شخصی هر صبح
- **Nachtschicht** (کار شبانهٔ پس‌زمینه) خبرهای واقعی را از Nachrichtenleicht و Tagesschau RSS برمی‌دارد و با علایق تو (کد، دیزاین، آلمان) ترکیب می‌کند.
- کلمه‌هایی که سررسید مرورشان رسیده، داخل متن بافته می‌شوند.
- خروجی یک پادکست دونفره در سطح خودت است که با Piper ساخته می‌شود.
- متن پادکست قابل کلیک است: هر کلمه را می‌شود ترجمه کرد یا استخراج کرد.
- برای گوش دادن موقع کار است و ساعت‌های غیرفعال را به ورودی مؤثر تبدیل می‌کند.

### 4. همراه دسکتاپ (Tauri) — آلمانی در کل ویندوز
- **کلید سراسری** `Ctrl+Alt+D`: متن انتخاب‌شده را در **هر اپی** ترجمه یا استخراج می‌کند؛ Telegram، Discord، VS Code، PDF و هر جای دیگر.
- **`Ctrl+Alt+O`:** از یک ناحیه از صفحه OCR می‌گیرد (با Windows OCR یا Tesseract `deu`) و متن را به Lesesaal یا کارت تبدیل می‌کند.
- **Live-Untertitel:** صدای سیستم (WASAPI loopback) را با Whisper به زیرنویس زندهٔ آلمانی تبدیل می‌کند، با قابلیت کلیک روی کلمه. برای Netflix، Discord، پادکست یا هر چیز دیگری.
- **Idle micro-cards:** وقتی بیکاری یا منتظر build هستی، یک کارت کوچک در گوشهٔ صفحه ظاهر می‌شود.
- **Stundenzähler:** زمان آلمانی را خودکار از همهٔ سطوح جمع می‌کند (صفحه‌های آلمانی، ویدئو، پادکست، تمرین‌ها).

### 5. یکپارچگی با محیط کار (مخصوص رشته‌هایت)
- **افزونهٔ VS Code به اسم «Kollege»:**
  - پیام commit و کامنت‌هایت را به آلمانی پیشنهاد و تصحیح می‌کند؛
  - کد ریویو به آلمانی انجام می‌دهد؛
  - سوال‌های واقعی فنی را به آلمانی با تو پیش می‌برد؛
  - روی hover، Fachwortschatz نشان می‌دهد.
- **CLI `gm`:**
  - `gm review` در ترمینال کارت مرور نشان می‌دهد؛
  - shell hook هم دارد: موقع `npm install` یا هر دستور طولانی، یک کارت ظاهر می‌شود.
- **Design-Kritik برای Mediengestalter:**
  - یک دیزاین آپلود می‌کنی؛
  - «Lena» به آلمانی و با واژگان تخصصی طراحی نقدش می‌کند؛
  - تو باید جوابش را با توضیح تصمیم‌های طراحی‌ات بدهی.

### 6. Vokal-Labor — تلفظ به‌صورت علمی و دیدنی
- **نمودار زندهٔ مصوت‌ها (F1/F2):** مصوت تو روی نقشهٔ مصوت‌های آلمانی، کنار هدف بومی، ظاهر می‌شود. محاسبه با LPC در خود مرورگر انجام می‌شود.
- **روی‌هم‌گذاری منحنی pitch** برای تمرین shadowing (لحن و ریتم جمله).
- **امتیاز صدا به صدا** با مدل فونمی wav2vec2 و هم‌ترازسازی (GOP).
- **کالبدشناسی دهان:** انیمیشن SVG برای ü، ö، ch و r آلمانی.

### 7. Stundenzähler و B2-Prognose
- همهٔ ساعت‌ها خودکار ثبت می‌شوند.
- یک مدل پیش‌بینی بر اساس ساعت، نرخ رشد واژگان و نمرهٔ آزمون‌های شبیه‌ساز، تاریخ رسیدن را تخمین می‌زند، مثلاً «B2 voraussichtlich am 14. April 2027».
- اگر عقب بیفتی، صادقانه و بدون سرزنش می‌گوید چه چیزی را تغییر بدهی.

---

## ماژول‌های پایه (وب‌اپ)
1. **Heute:** برنامهٔ تطبیقی روزانه، بودجهٔ ساعتی، پیش‌بینی، پیام‌های تازه از NPCها، و پادکست امروز.
2. **Wortschatz:**
   - مرور FSRS با صوت، رنگ Genus، Cloze و صرف؛
   - حالت Blitz که کاملاً با کیبورد کار می‌کند.
3. **Lesesaal:**
   - وارد کردن URL، EPUB، PDF یا OCR؛
   - ساده‌سازی متن به سطح تو؛
   - هایلایت به سبک LingQ؛
   - «Geschichten aus deinem Wortschatz».
4. **Hören:** Diktat تایپی با diff، shadowing، minimal pairs، و کتابخانهٔ محتوای مدرج.
5. **Sprechen:** مکالمهٔ صوتی با شخصیت‌ها، تصحیح بعد از مکالمه، و لینک به Vokal-Labor.
6. **Schreiben:**
   - Tagebuch با تصحیح درون‌خطی؛
   - مربی Anschreiben و Lebenslauf (خروجی PDF واقعی برای Bewerbung).
7. **Grammatik-Atlas:**
   - Satzklammer-Visualizer؛
   - Kasus-Maschine؛
   - Adjektivendungen-Trainer؛
   - تمرین‌هایی که بر اساس Fehlerprofil ساخته می‌شوند.
8. **Prüfung:**
   - شبیه‌ساز دیجیتال Goethe و telc برای B1 و B2، با زمان‌سنج و روبریک رسمی؛
   - بخش Sprechen به‌صورت صوتی.
9. **Ausbildung:**
   - مسیرهای FIAE/FISI و Mediengestalter؛
   - شبیه‌ساز Vorstellungsgespräch؛
   - سناریوهای محل کار؛
   - متن‌های Berufsschule.
10. **Leben in DE:** با «Neues Leben» ادغام شده است.
11. **Zettelkasten:** گراف دانش شخصی.
12. **Sprachgrenze:** جهان سه‌بعدی واژگان و آمار.

## افزونهٔ Chrome
- **Lookup و Mine:** با Alt+کلیک روی هر کلمه.
- **YouTube:**
  - زیرنویس دوگانه؛
  - mining همراه با برش صوتی؛
  - auto-pause.
- **Diglot weave** روی صفحه‌های انگلیسی.
- **New Tab:** چند کارت مرور در هر بار باز کردن تب جدید.
- **ثبت زمان** صفحه‌های آلمانی برای Stundenzähler.

---

## معماری

```
Germanio/  (pnpm + Turborepo)
├─ apps/
│  ├─ web/        Next.js 15 + React 19 + Tailwind v4 (PWA)
│  ├─ extension/  WXT (Chrome MV3) + React
│  ├─ desktop/    Tauri v2 — tray, global hotkeys, OCR, overlay, loopback audio
│  ├─ vscode/     "Kollege" VS Code extension
│  └─ cli/        `gm` terminal client + shell hooks
├─ services/
│  ├─ brain/      Node + Hono @127.0.0.1:4317 — API, SQLite/Drizzle, FSRS, BKT,
│  │              job queue ("Nachtschicht"), NPC engine, LLMProvider
│  └─ lab/        Python FastAPI @4318 — spaCy de, faster-whisper (incl. streaming),
│                 Piper, XTTS/F5 voice clone, wav2vec2 phoneme scoring
├─ packages/
│  ├─ core/       zod schemas, learner model, CEFR/forecast math
│  ├─ ui/         design system + motion primitives
│  ├─ i18n-adaptive/
│  ├─ client/     typed SDK for brain (shared by all 5 clients)
│  └─ data/       ETL → dictionary.sqlite
└─ content/       personas, story chapters, scenarios, exam templates, Fach tracks
```

- **Brain** هستهٔ مرکزی است. پنج کلاینت (وب، افزونه، دسکتاپ، VS Code و CLI) همگی از طریق `packages/client` با brain صحبت می‌کنند. این خودش یک داستان معماری قوی برای پورتفولیو است.
- **AI از طریق Codex:**
  - اینترفیس `LLMProvider` با پیاده‌سازی `CodexProvider` روی `@openai/codex-sdk` (با لاگین ChatGPT)؛
  - sandbox فقط‌خواندنی، پوشهٔ موقت ایزوله، و خروجی ساختاریافته که با zod اعتبارسنجی می‌شود.
- **راه‌حل کندی Codex:**
  - **Nachtschicht** همهٔ محتوای سنگین را از قبل و در پس‌زمینه می‌سازد: پادکست، داستان‌ها، پیام‌های NPC، درس‌ها، معنی‌ها.
  - کارهای بلادرنگ از دیکشنری محلی جواب داده می‌شوند.
  - در مکالمه، پاسخ stream می‌شود و هر جمله به محض آماده شدن به TTS می‌رود.
  - پیام‌رسان ذاتاً ناهمزمان است.
- **محدودیت‌های اشتراک:** کش بر اساس hash محتوا و شمارندهٔ مصرف.
- **دموی عمومی:** فقط از پاسخ‌های ضبط‌شده استفاده می‌کند، چون اشتراک فقط برای استفادهٔ شخصی است.
- **انعطاف:** اینترفیس اجازه می‌دهد بعداً Ollama، OpenAI API یا Claude API جایگزین شوند.
- **داده‌ها:**
  - منابع:
    - kaikki.org (Wiktionary، CC-BY-SA): Genus، جمع، صرف، IPA؛
    - Tatoeba (CC-BY): جمله و صوت؛
    - FrequencyWords و Leipzig: فهرست تکرار؛
    - spaCy: lemmatization؛
    - Codex: معنی فارسی و تگ CEFR و حوزه.
  - دو فایل SQLite جدا داریم: `dictionary.sqlite` که فقط‌خواندنی است، و `learner.sqlite` برای داده‌های شخصی.

## طراحی (هدف: Awwwards Site of the Day)
- **مفهوم:** «Bauhaus trifft Sternenhimmel»، یعنی گرید سوئیسی سخت در کنار یک جهان WebGL زنده.
- **رنگ:**
  - پس‌زمینهٔ کاغذی `#F2EFE8` یا جوهری `#0E0E10`؛
  - **تنها رنگ‌های اشباع‌شده، رنگ‌های Genus هستند**، پس رنگ همیشه معنا دارد.
- **تایپوگرافی:**
  - Bricolage Grotesque یا Instrument Sans برای نمایش؛
  - Geist Mono برای داده؛
  - Vazirmatn برای فارسی، با پشتیبانی کامل RTL.
- **امضای حرکتی:** واژه‌های مرکب آلمانی با انیمیشن به اجزایشان شکافته می‌شوند (`Ausbildungs|vertrag`).
- **حرکت:**
  - GSAP و ScrollTrigger؛
  - Motion؛
  - Lenis؛
  - View Transitions؛
  - فیزیک کارت‌ها.
- **WebGL (R3F و shaderهای سفارشی):**
  - Sprachgrenze؛
  - صحنهٔ اول لندینگ؛
  - نمودار مصوت‌ها.
- **ظاهر دسکتاپ:** overlay دسکتاپ و پیام‌رسان با همان زبان بصری، مثل یک محصول واحد.
- **صدا:** طراحی صوتی ظریف و قابل خاموش کردن.
- **دسترسی و کیفیت:**
  - Command palette (`⌘K`)؛
  - رعایت `prefers-reduced-motion`؛
  - کنتراست AA؛
  - Lighthouse بالای ۹۰.
- **صفحه‌های عمومی:**
  - `/` روایت فلسفی؛
  - `/demo` دمو؛
  - `/case-study`؛
  - ویدئوی معرفی.

---

## نقشهٔ راه (خودت از هفتهٔ ۲ با آن یاد می‌گیری)
| فاز | زمان | خروجی |
|---|---|---|
| **0. پایه** | هفتهٔ ۱ | monorepo، توکن‌های طراحی، ETL دیکشنری، اسکلت brain، `CodexProvider` با تست دود |
| **1. MVP** | هفته‌های ۱ تا ۳ | Heute، Wortschatz با FSRS، افزونه (lookup و mine)، i18n تطبیقی، Piper، Zettelkasten پایه |
| **2. ورودی و خروجی** | هفته‌های ۴ تا ۶ | Lesesaal، Schreiben با تصحیح، Fehlerprofil و BKT، Grammatik-Atlas، Stundenzähler |
| **3. Ambient** | هفته‌های ۷ تا ۹ | همراه دسکتاپ (hotkey، OCR، micro-cards)، CLI `gm`، Nachtschicht، Tagesfunk |
| **4. گفتار** | هفته‌های ۱۰ تا ۱۳ | lab، Sprechen، Diktat، Vokal-Labor، Live-Untertitel، زیرنویس یوتیوب، diglot weave |
| **5. دنیا** | هفته‌های ۱۴ تا ۱۷ | Neues Leben، Messenger و NPCها، Ausbildung، Prüfung، VS Code Kollege، Design-Kritik |
| **6. امضا** | هفته‌های ۱۸ تا ۲۰ | Zukunftsstimme، Sprachgrenze سه‌بعدی، B2-Prognose، لندینگ Awwwards، دمو، case study |

### اولین قدم‌ها بعد از تأیید
1. پیش‌نیازها:
   - `npm i -g pnpm @openai/codex`
   - `codex login` که خودت با حساب ChatGPT انجام می‌دهی؛
   - Rust toolchain برای Tauri (در فاز ۳ لازم می‌شود)؛
   - venv پایتون برای lab.
2. `git init`، اسکلت Turborepo، TypeScript، ESLint و Prettier.
3. ETL `packages/data` و ساخت `dictionary.sqlite`.
4. Brain: `/health`، `CodexProvider` با zod، Drizzle و endpointهای FSRS.
5. `packages/ui` و صفحه‌های Heute و Wortschatz.
6. افزونه: lookup و Mine.

## Verification
- **Vitest:**
  - FSRS؛
  - BKT؛
  - Tagesplan؛
  - مدل پیش‌بینی؛
  - i18n تطبیقی؛
  - parse خروجی Codex با fixture.
- **ETL:** کلمه‌های نمونه `Haus` (das/Häuser)، `gehen` (ging/gegangen) و `Bewerbung` (die) باید درست دربیایند.
- **Brain:** `curl 127.0.0.1:4317/health` باید وضعیت brain، lab و Codex را گزارش کند. یک فراخوانی واقعی Codex با اعتبارسنجی اسکیما انجام شود.
- **Playwright:** جلسهٔ Heute، سپس مرور، سپس import در Lesesaal، سپس mine، و ظاهر شدن کارت در صف.
- **کلاینت‌ها:**
  - افزونه به‌صورت unpacked روی tagesschau.de و یوتیوب تست شود؛
  - hotkey دسکتاپ در Telegram و VS Code؛
  - `gm review` در ترمینال.
- **گفتار:**
  - دقت رونوشت Whisper؛
  - امتیاز تلفظ؛
  - تأخیر مکالمه کمتر از ۴ ثانیه تا اولین صدا؛
  - تأخیر Live-Untertitel کمتر از ۲ ثانیه.
- **طراحی:**
  - Lighthouse و axe؛
  - عرض موبایل؛
  - reduced-motion؛
  - بررسی بصری با built-in browser.
- **معیار موفقیت واقعی:**
  - شبیه‌ساز B1 در ماه ۳ و شبیه‌ساز B2 در ماه ۶؛
  - B2-Prognose باید با نتیجهٔ واقعی آزمون هم‌خوانی داشته باشد.
