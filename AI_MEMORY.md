# AI_MEMORY.md — „ხრამუნა“ (Khramuna) ცენტრალური მეხსიერება და სისტემური ჟურნალი

ეს დოკუმენტი წარმოადგენს პროექტის ოფიციალურ, სრულყოფილ წყაროს (Single Source of Truth).
ყველა ცვლილება, არქიტექტურული გადაწყვეტილება და სისტემური პარამეტრი ფიქსირდება აქ.

---

## 1. პროექტის მიმოხილვა & ბიზნეს პროფილი
* **ბრენდი:** „ხრამუნა“ (Khramuna) — 100% ნატურალური, დეჰიდრირებული (დაბალ ტემპერატურაზე გამოყვანილი) ხორცის პრემიუმ სასუსნავები ძაღლებისთვის და კატებისთვის.
* **დამფუძნებელი / მმართველი:** ლაშა ხიჯაკაძე.
* **მთავარი მიზანი:** სრულად უფასო (0 GEL/USD), მაღალტექნოლოგიური ავტომატიზაცია Facebook Messenger-სა და Instagram Direct-ში Gemini AI-ის მეშვეობით.

---

## 2. პროდუქციის კატალოგი და ფასები
1. **„დრაკონის თათები“ (100გ) — 18₾**
   - შემადგენლობა: 100% ქათმის ფეხი (დეჰიდრირებული).
   - სარგებელი: კოლაგენი და გლუკოზამინი სახსრებისთვის, კბილების ბუნებრივი წმენდა ნადებისგან.
2. **„ღრუბელი“ (50გ) — 15₾**
   - შემადგენლობა: 100% საქონლის ფილტვი.
   - სარგებელი: ჰაეროვანი, უცხიმო, დაბალკალორიული, ადვილად იმტვრევა, იდეალურია წვრთნისთვის და ლეკვებისთვის.
3. **„სუპერ-კუბები“ (80გ) — 17₾**
   - შემადგენლობა: 100% საქონლის ღვიძლი.
   - სარგებელი: A და B ვიტამინების ბომბი, ძლიერი ხორცის არომატი, უყვარს ყველა პრეტენზიულ ძაღლს.
4. **„ჯადოსნური პუდრა“ (40გ) — 12₾**
   - შემადგენლობა: 100% სუფთა ხორცის ფხვნილი-ტოპინგი.
   - სარგებელი: საკვებზე მოსაყრელად უმადობისა და მადის გასაღვიძებლად.
5. 🎁 **„Full Pack“ (სრული ოთხეული) — 49.50₾**
   - 62₾-ის ნაცვლად (დაზოგვა 12.50₾, 20%-ზე მეტი ფასდაკლება!) + **თბილისში უფასო მიტანა**.

---

## 3. მიწოდება და გადახდის რეკვიზიტები
* **მიწოდება თბილისში:** 5₾ საკურიერო (24-48 საათში). **45₾-დან ან Full Pack-ზე მიწოდება უფასოა!**
* **რეგიონებში:** საქართველოს ფოსტით / საკურიეროთი (2-3 სამუშაო დღე).
* **გადახდა:** ნაღდი კურიერთან ან საბანკო გადარიცხვა (რეკომენდებული):
  - **TBC Bank:** `GE89TB7331945061100067` (მიმღები: ლაშა ხიჯაკაძე)
  - **Bank of Georgia (BOG):** `GE86BG0000000570774787` (მიმღები: ლაშა ხიჯაკაძე)
  - დანიშნულება: *„ხრამუნა - შეკვეთა“*

---

## 4. ტექნიკური არქიტექტურა და ინფრასტრუქტურა
* **ჰოსტინგი:** Vercel Serverless Production (`https://khramuna-bot.vercel.app`).
* **Webhook Endpoint:** `https://khramuna-bot.vercel.app/webhook` (Verify Token: `khramuna_secret_verify_token`).
* **Meta App ID:** `1447844490571748` (Khramuna — Live / Published).
* **Facebook Page ID:** `928195650386088` (Khramuna).
* **Instagram Business ID:** `17841427052704939` (`@khramuna_snacks`).
* **ტოკენების სტატუსი:**
  - `FB_PAGE_ACCESS_TOKEN`: **უვადო (Never-Expiring, `expires_at: 0`)**.
  - `IG_ACCESS_TOKEN`: პირდაპირი Instagram Graph API ტოკენი.
* **ხელოვნური ინტელექტი (AI Engine):**
  - ძირითადი: `gemini-flash-lite-latest` (Google Gemini API — სწრაფი, საიმედო, უვადო ქვოტით).
  - სარეზერვო: `gemini-3.5-flash-lite`.
* **შეტყობინებების არხები:**
  - Telegram Bot: `8602396382:AAFiNvqT4SInU4VcIDSJmV31FdK-spMKm7M` (Chat ID: `1317626946`).
  - Google Sheets: `https://script.google.com/macros/s/AKfycbwJOqYmyrAiQrRR2t6mIC9s93xWSh7NyWrw2RBoGYr_mrtlhn0cv5-Buclf3uucRU_SHw/exec`.

---

## 5. დანერგილი ბიზნეს წესები & გაყიდვების ინტელექტი
1. **მიმართვა:** მკაცრად და ყოველთვის თავაზიანი „თქვენობით“. კატეგორიულად აკრძალულია „ძვირფასო“, „მეგობარო“, „პატივცემულო“, „ბატონო/ქალბატონო“.
2. **მისალმება:** მოკლე მისალმება და ერთი კითხვა (კატალოგის დაფარვის გარეშე).
3. **ფასები & აქცია:** 4-ვე პროდუქტი + Full Pack (49.50₾) უფასო მიტანით.
4. **Upsell შეთავაზება:** თუ კალათა < 45₾, ბოტი მეგობრულად სთავაზობს მეორე პროდუქტის დამატებას უფასო მიტანისთვის.
5. **ცუგას ბარათი (Pet Profile):** იმახსოვრებს სახელს, ჯიშს, ასაკსა და ალერგიებს.
6. **შეკვეთის ჩეკი-დადასტურება:** შეკვეთა არ ფორმდება პროდუქტისა და რაოდენობის დაზუსტების გარეშე. იგზავნება შემაჯამებელი ჩეკი კლიენტის თანხმობისთვის.
7. **ესკალაცია & პაუზა:** რთულ საკითხებზე ითხოვს ნომერს დამფუძნებლისთვის და აპაუზებს ავტო-პასუხს.

---

## 6. გაკვეთილები და გადაჭრილი პრობლემები (Lessons Learned)
- **[2026-10-07] Meta Tokens:** დროებითი User ტოკენები 1 საათში იწურება. აუცილებელია `Expires: Never` Page Access Token-ის გამოყენება.
- **[2026-10-07] Duplicate Messages:** Meta Webhooks-ზე აუცილებელია Message ID (`mid`) დედუპლიკაცია, რათა განმეორებითი მოთხოვნისას ბოტმა ორჯერ არ უპასუხოს.
- **[2026-10-07] Gemini Models:** `gemini-3-flash-preview` გადატვირთვის გამო აბრუნებს 503-ს. პროდაქშენში გამოიყენება `gemini-flash-lite-latest`.
- **[2026-10-07] Vercel Serverless Freeze:** Vercel-ზე არ შეიძლება ფონური unawaited `setTimeout` (5-8 წამიანი დაყოვნებები). ყველა გამოძახება (მათ შორის კომენტარებზე) უნდა იყოს პირდაპირი და `await`-ით გარანტირებული.
- **[2026-10-09] Catalog Math & Meta CDN:** Full Pack-ის რეალური ჯამი 4-ვე პროდუქტზე არის 62₾ (დაზოგვა 12.50₾ 49.50₾-ზე). Meta-ს სურათების CDN კეშირების თავიდან ასაცილებლად საჭიროა `is_reusable: false` და ფაილების ვერსიონირება.


## 6. Visual Realism & Product Appearance Standards (Added 2026-10-10)
- **Product Textures & Physical Forms:**
  - **ღრუბელი (Cloud):** 100% საქონლის ფილტვი — **დაჭრილია პატარა კუბიკებად** (მუქი ყავისფერი, ჰაეროვანი ხორცის კუბიკები). არასდროს გამოსახოთ პურის ნაჭრის ან საყოფაცხოვრებო ღრუბლის ფორმით!
  - **დრაკონის თათები:** მთლიანი, ოქროსფერი, გამომშრალი ხრაშუნა ქათმის თათები.
  - **სუპერ-კუბები:** საქონლის ღვიძლის მუქი, მკვრივი კუბიკები.
  - **ჯადოსნური პუდრა:** წმინდად დაფქული ხორცის ნატურალური ფხვნილი.
- **Labeling Standard:**
  - **არავითარი ხისტი 2D სტიკერების დაკვრა ფოტოებზე:** ხელოვნურად ჩასმული ბრტყელი სტიკერი ანადგურებს ფოტოს რეალიზმს. შეფუთვა უნდა გენერირდებოდეს ორგანულად, სცენის ნაწილად.
- **AI Metadata Stripping Standard (მეტამონაცემების წაშლა):** ყოველი ახალი ფოტოდან ავტომატურად იწმინდება C2PA, EXIF და AI მარკირება (სუფთა RGB პიქსელების გადაშენახვით), რათა Meta-მ (Facebook/Instagram) არ მიაკრას „AI info“ იარლიყი და ვიზუალი გამოიყურებოდეს როგორც 100% ავთენტური კამერის ფოტო.
- **Copywriting:**
  - მკაცრად აკრძალულია „ფერმერული ხორცი“. გამოიყენება: „100% ნატურალური, ადგილობრივი სუფთა ხორცი“ ან „სუფთა, შერჩეული ქართული ხორცი“.
- - **[2026-10-10] Georgian Grammar & Unicode Boundaries:** JavaScript regex `\b` არ მუშაობს ქართულ ანბანზე (`[ა-ჰ]`). აუცილებელია Lookaround-ების გამოყენება (`(?<![ა-ჰ])` და `(?![ა-ჰ])`). ბოტში დანერგილია პირის შეთანხმების რკინის წესი: არავითარი „შენ გავაკეთებ“, „შენ დაგიდასტურებ“ და „შენობით“ მიმართვა — მხოლოდ „თქვენობით“ და „გაგიკეთებთ/დაგიმზადებთ“.

- [2026-10-11] Live Chat Optimization: 1) Fast-checkout (არავითარი ზედმეტი კითხვა შეკვეთისას), 2) პუდრის მკაფიო შემადგენლობა (100% საქონელი, უქათმო ალერგიებისთვის), 3) B2B დისტრიბუციის ესკალაცია, 4) ფოტოს მიღებისას წინა დიალოგის კონტექსტის შენარჩუნება.

- [2026-10-12] Architecture & Conversational Hardening: 1) Meta Graph API /{PAGE_ID}/conversations?user_id={PSID} უზრუნველყოფს სრულ ისტორიას Vercel Cold Starts-ის დროს გარე ბაზის გარეშე, 2) Gemini 2.5 Flash იღებს inlineData აუდიოს base64-ით ქართული ხმოვანი შეტყობინებების გასაშიფრად, 3) Smart Debounce აერთიანებს 1.8 წამში მიმდევრობით მიღებულ შეტყობინებებს ერთიან პასუხში დუბლირების გარეშე, 4) 7 რეალური წინააღმდეგობის დამუშავება (ექსპრეს მიტანა Wolt/Bolt-ით, POS ტერმინალის უარყოფა mBank-ით, ფასდაკლების გადამისამართება Full Pack-ზე, კატის უსაფრთხოება, მოქნილი მისამართი, დაბრუნებული კლიენტის ემპათია, დელიკატესი vs კორმი).
- [2026-10-12] Conversational Edge-Cases: 1) ექსპრეს მიტანის ფანჯარა გაიზარდა 1-3 სთ-მდე + ღამის 21:00-ის შემდეგ დილის რეისის შეთავაზება, 2) კონკრეტული სლოტის მოთხოვნა იწერება deliveryNotes-ში კურიერისთვის, 3) 1-1.5 თვის ლეკვებისთვის დეჰიდრირებული ხორცის მკაცრი ბლოკი (მხოლოდ რძე/სტარტერი 2 თვემდე), 4) მწვავე სამედიცინო კრიზისისას (ღებინება/დიარეა) გაყიდვის სრული ბლოკი და ვეტერინართან გადამისამართება, 5) საჩუქრის ნაკადი (გადამხდელის და მიმღების გამიჯვნა უჩეკოდ).
- [2026-10-12] CRM, Vision & Order Tracking Architecture: 1) CRM Entity Memory (profiles.json) ავტომატურად იმახსოვრებს ცუგას სახელს, ჯიშსა და ალერგიებს და 1 თვის შემდეგაც მიმართავს სახელით, 2) Order Tracking ავტომატურად იღებს აქტიური შეკვეთის მონაცემებს და კლიენტს აწვდის ზუსტ ინფორმაციას კურიერის საათებზე (12:00-19:00), 3) Gemini 2.5 Flash Vision OCR აანალიზებს გადარიცხვის ქვითრებს (TBC/BOG), ამოწმებს თანხას და სტატუსს, ხოლო ძაღლის ფოტოს გამოგზავნისას შეუფერხებლად გადადის შინაური ცხოველის შექებაზე.
- [2026-10-13] Conversational Optimization: 1) Local Handover (საბურთალო / მეტრო სახელმწიფო უნივერსიტეტი) ადგილობრივი კლიენტის გადარჩენისთვის დამფუძნებლის ესკალაციით, 2) Product Mirroring მომხმარებლის მიერ გამოყენებული ტერმინების ასახვით (ქათმის თათები = დრაკონის თათები), 3) „მადლობა“-ს Fast-Path განასხვავებს დასრულებულ და მიმდინარე შეკვეთას გაყიდვის ძაბრის გადასარჩენად, 4) Visual Intent დამუშავება ქართული სასაუბრო ფორმებისთვის („ჩამიგდოთ“, „მაჩვენეთ“) კონტექსტური პროდუქტის ისტორიით, 5) პრეტენზიული მჭამელების (Picky Eaters) ტკივილის დროს „ჯადოსნური პუდრის“ პრიორიტეტული რეკომენდაცია.
- [2026-10-13] Humanization & Conversational Guardrails: 1) „რჩევა მჭირდება“-ზე კატალოგის დაგდების აკრძალვა — გადართვა დიეტოლოგ-კონსულტანტის რეჟიმზე (ჯიში/ასაკი/ალერგია), 2) ფასის გაგებისას („Fasi rawvs“) პირდაპირი Closing შეკვეთის შეთავაზებით („გავამზადოთ ერთი ქილა თქვენთვის?“), 3) დამშვიდობების პინგ-პონგის Guard (მადლობა/კარგად იყავით-ის განმეორებისას მხოლოდ თბილი ემოჯი და დიალოგის გაჩერება), 4) იუმორისა და ქართული ბანტერის მიღება („სიტყვა არ შემარჩინეთ რა 🤣“ -> „ხო, მართალი ხართ 😂 ჩუმად ვარ!“), 5) Debounce ფანჯარა გაიზარდა 3.2 წამამდე და დაემატა Fast-Path სუფთა ემოჯებზე/სტიკერებზე სარეკლამო სპამის თავიდან ასაცილებლად.
- [2026-10-13] Comment Automation & Social Selling: 1) commentMonitor.js-ის ენდფოინთი გასწორდა posts-ით და დაემატა Instagram Media კომენტარების მხარდაჭერა, 2) საჯარო კომენტარებში ფასები გახდა გამჭვირვალე (Public Price Transparency + DM Hook პირად მესენჯერში), 3) გასწორდა ReferenceError (GEMINI_TEXT_URL) და მოდელი განახლდა gemini-2.5-flash-ზე (503 ოვერლოადის ასაცილებლად), 4) vercel.json-ში ჩაემატა 10-წუთიანი Cron Job (/api/cron-comments) გამოტოვებული კომენტარების ფონური სკანირებისთვის.
- [2026-10-13] Strategic & Psychological Objections: 1) ქათმის ძვლის შიშის განეიტრალება (მოხარშული მყიფე ძვალი vs დეჰიდრირებული რბილი ხრტილი/კოლაგენი <70°C), 2) დღიური ხარჯის ეკონომიკა (50გ ფილტვი = ~300გ ხორცი, 1 შეკვრა ყოფნის 2-3 კვირა -> 80თ-1₾ დღეში), 3) სუპერმარკეტის მასობრივი ჩხირების (Dentastix: მარცვლეული/სახამებელი/გლიცერინი) კონტრასტი 100% ხორცთან, 4) შეკვეთაზე პერსონალიზებული სიურპრიზ-სემპლის დაპირება (Surprise & Delight).

- [2026-10-13] Meta Graph API Comment Permissions: Meta Error #200 on POST /{comment_id}/comments strictly requires pages_manage_engagement scope; GET /{post_id}/comments requires pages_read_user_content (Error #10). Until scopes are added in Graph API Explorer, commentMonitor automatically falls back to sendPrivateReply (via pages_messaging) so customer comments are answered via Messenger immediately without drops.
- [2026-10-14] Notifications & Phone Normalization: 1) Georgian mobile numbers frequently arrive with leading 0 (0599...) or +995; stripping leading 0 and 995 in both AI system prompt instructions and backend validation ensures zero false order rejections, 2) Human handoff and B2B wholesale keywords trigger instant Telegram priority alerts with deep links to Meta Business Suite Inbox while pausing bot to prevent bot interruptions.

- [2026-10-14] Meta Permanent Token Architecture: Generated Never-Expiring Page Access Token (expires_at: 0) for Khramuna (928195650386088) using Meta App Secret fb_exchange_token flow. Updated .env and Vercel Production. Bot is permanently active.

- [2026-10-15] Comment Threading & Vision Hardening: 1) Facebook Graph API /{post_id}/posts requires comments{...,comments{id,message,from,created_time}} to parse nested sub-replies; checking whether Page replied after the sub-comment ensures follow-up comments (e.g. breed clarifications like "ბიშონი") are never dropped, 2) Upgraded Gemini backup model to gemini-2.5-pro and Vision receipt OCR to gemini-2.5-flash to eliminate 503 Service Unavailable errors on gemini-3.7-flash.

- [2026-10-16] Conversational Hardening & JSON Leak Elimination: 1) Added regex extraction fallback in safeParseJson and pre-send interceptor in server.js to completely prevent raw JSON payloads from reaching Messenger users when Gemini outputs unescaped newlines in JSON strings, 2) Implemented session greeting deduplication to eliminate robotic "გამარჯობა [სახელი]" repetitions on turns 2+, 3) Added Georgian visual slang detection ("რომ ჩამიგდოთ", "ჩამიგდეთ", "მაჩვენეთ") to trigger product photo delivery instead of prematurely asking for delivery address, 4) Added Direct Price Inquiry Closing rule ("fasi rawvs" -> offer immediate order closing instead of passive questions) and Georgian banter guard.

- [2026-10-16] Admin Dashboard Architecture: Implemented built-in management control center (/dashboard, /admin) with PIN authentication (khramuna2026) for live overview KPIs, Messenger live inbox with 1-click bot pause/resume & founder direct reply, Facebook/Instagram comments radar, order status CRM with CSV export, pet directory CRM, and real-time stock switches.

- [2026-10-16] Meta Production Architecture & Token Recovery: 1) Discovered Vercel production FB_PAGE_ACCESS_TOKEN was accidentally set to empty string "" during manual spawn attempt; resolved via non-interactive 'vercel env add --value' flag and redeployed. 2) Applied architectural standards from Meta's official reference repository (fbsamples/original-coast-clothing): configured Messenger Profile API (Get Started button, localized Georgian greeting, and persistent menu for Catalog/Full Pack/Operator). 3) Handled GET_STARTED and HUMAN_HANDOFF postbacks in server.js. 4) Configured automated 10-minute cron in vercel.json for /api/cron-comments. 5) Tuned typing delay (800-2000ms) to prevent Meta webhook delivery timeouts.

- [2026-10-16] CRM Data Hydration & Serverless Storage Fix: Resolved missing orders & dog profiles in dashboard. 1) Root cause: Vercel serverless /tmp/khramuna-data starts empty and previously lacked seeding from repository data/ files, plus repo data/orders.json was unpopulated. 2) Extracted complete historical CRM dataset from all 66 Meta customer conversations: 12 real customer orders (267 GEL) and 66 pet profiles with customer names, dog breeds, allergies, addresses, and phone numbers. 3) Added automatic seed fallback in storage.js and dashboard.js (getProfilesMap) to hydrate /tmp from bundled data/. 4) Fixed frontend allergy null safety and added human owner names to the Dog Directory.

- [2026-10-16] Strategic Geographic Focus (Phase 1): Strict Tbilisi-only courier delivery policy established. AI bot warmly informs regional inquiries (Batumi, Kutaisi, etc.) that operations currently cover Tbilisi for guaranteed freshness, offering delivery to Tbilisi relatives/friends, and prevents automated checkout for regional addresses.

- [2026-10-16] Persona Hardening & CRM Sanitation: 1) Neutralized profanity echoes and toxic inputs with deterministic safety regex shield in server.js and ai.js; 2) Enforced strict cart validation gate blocking ghost order confirmations when items are unselected; 3) Cleaned Facebook page ID leaks from CRM phone numbers and purged payment/inquiry phrases from preferredAddress; 4) Injected consultative vet reassurance, Saburtalo pickup routing, and Georgian Post regional workflows into AI prompt.

- [2026-10-16] Gemini Vision Kinologist & Intelligent AOV Upsell: 1) Upgraded pet photo pipeline in server.js and ai.js from blind text prompts to Gemini 2.5 Flash Multimodal Vision; incoming dog photos now extract breed, puppy/adult age stage, generate warm expert kinologist advice, and auto-persist petBreed/petAge into CRM profiles.json; 2) Implemented Mathematical Conversion Framing for courier fees (<45 GEL orders frame the 5 GEL courier cost into Full Pack savings: 62 GEL -> 49.50 GEL + free delivery = 17.50 GEL value); 3) Added interactive contextual quick-reply pills for Upsell decisions (Full Pack / Single pack / Add Lung) and expanded sliding session history to 30 turns.

- [2026-10-16] Split-Bubble Messaging & Few-Shot Golden Transcripts: 1) Implemented deliverConversationalReply in server.js to break monolithic AI essays into 2 natural human-paced bubbles (reaction/compliment -> 1.2s-2.0s typing indicator -> advice/CTA); 2) Injected 4 Golden Few-Shot Georgian transcripts into ai.js system instructions to ground Gemini's tone, brevity, and authentic shopkeeper warmth; 3) Deployed to Vercel production.

- [2026-10-16] Confirmed-Delivery Care Follow-Up: 1) Created src/services/followUp.js with strict zero-embarrassment guards (executes ONLY on orders explicitly marked status === 'DELIVERED', requires deliveredAt timestamp, 24h-96h elapsed time, deduplication, and !isBotPausedForUser); 2) Added 1-click '💌 მოკითხვის გაგზავნა' button in admin dashboard order modal; 3) Integrated automated follow-up check into 10-minute cron endpoint; 4) Injected post-delivery delight/advice handling rules into ai.js.
- [2026-10-17] Unit Economics & Tone Detox: 1) Strict Tbilisi-Only Policy enforced in ai.js and safeParseJson (enforceTbilisiDeliveryGuard blocks isOrderReady and sets order to null on regional cities like Samtredia/Kutaisi/Batumi to eliminate negative unit-economic postage fees of 15-20 GEL); 2) Anti-Salesy Tone Detox: eliminated aggressive bazar upselling ("17.50₾-ს ზოგავთ!", pushing Full Pack when customer requests 1 item), re-anchored Few-Shot Dialogue 3 to direct, restrained artisan checkout with zero haggle, and reserved bundle offers strictly for explicit advice requests or multi-item selections.
- [2026-10-17] Deep Precision & Parallel System Hardening: 1) JavaScript Regex Unicode Boundary: discovered \b fails on Georgian characters (ASCII-only); replaced with Unicode property lookarounds (?<!\p{L}) and (?!\p{L}) with /iu flag to capture Georgian locative inflection ("ბათუმში", "ქუთაისში", "რუსთავში") and Latin transliterations ("Batumshi", "Kutaisshi"); 2) Protected Tbilisi streets named after regions ("ქუთაისის ქუჩა", "ბათუმის ქუჩა", "რუსთაველის გამზირი", "გორგასლის ქუჩა") from false positive rejections; 3) Removed lingering '📦 რეგიონი (ფოსტა)' quick reply button in server.js to eliminate regional post invitations in Messenger; 4) Injected strict Tbilisi-only delivery rules into buildFeedAuthorityPrompt for Facebook comment radar.

---

## 13. გრამატიკული სისუფთავე და ცოცხალი ადამიანური ტონი (Grammar Purity & Human Voice)
* **რეგიონალური მიწოდების გულწრფელი და ლოგიკური მიზეზი (Zero Fake Excuses):**
  - კატეგორიულად აკრძალულია „სიახლის შენარჩუნების“ მოტივით თავის მართლება (დეჰიდრირებული ხორცი დალუქულ შეფუთვაში 6 თვე ძლებს, ამიტომ „სიახლის გამო ვერ ვაგზავნით“ არის ალოგიკური და ყალბი!).
  - 100% სიმართლე: საკურიერო მიწოდება გვაქვს მხოლოდ თბილისში (ჩვენი შიდა კურიერით), ხოლო რეგიონებში ფოსტით გაგზავნა გაჩერებულია მაღალი საფოსტო ტარიფებისა და ლოჯისტიკის გამო.
* **აკრძალული აბსურდული შესიტყვებები და რობოტული კლიშეები:**
  - ❌ „რჩევა შეგირჩიოთ? / რჩევა შევურჩიოთ?“ -> ✅ „რამე ხომ არ გირჩიოთ? / შეგირჩიოთ რამე? / რჩევა ხომ არ გჭირდებათ?“ (ქართულში რჩევა *მიეცემა*, სასუსნავი კი *შეირჩევა*!)
  - ❌ „სწორი არჩევანის გაკეთება“ -> ✅ „საუკეთესო სასუსნავის შერჩევა / თქვენს ცუგაზე მორგება“ (ინგლისური კალკის პრევენცია)
  - ❌ „ოთხფეხა მეგობარი“ (წიგნური, გაზეთური შაბლონი) -> ✅ „თქვენი ცუგა / თქვენი პატარა / ძაღლი“
  - ❌ „რომელი უფრო მოგეწონათ?“ (სანამ გაუსინჯავს!) -> ✅ „რომელი გაინტერესებთ? / რომლით დავიწყოთ? / რომელი გავამზადოთ გასასინჯად?“
  - ❌ „შესანიშნავი არჩევანია! თქვენი არჩევანი: ...“ (სერვერის ავტომატური პასუხი) -> ✅ „დიდი სიამოვნებით! 🐾 ... გაგიმზადებთ“
* **ნამდვილი თბილისელი ხელოსნის პიროვნება (Authentic Artisan Persona):**
  - მზრუნველი, ემპათიური, ლაღი და მეგობრული მასპინძელი, რომელსაც თვითონ ჰყავს ძაღლი და საკუთარი ხელით ამზადებს ხრამუნებს.
  - არავითარი გაყინული ბანკური ოფიციოზი და არავითარი აგრესიული შეტენვა.
* **აკრძალული კორპორაციული/ქოლ-ცენტრის კლიშეები:**
  - ❌ „ჩვენი პროდუქცია“ -> ✅ „ჩვენი სასუსნავები / ხრამუნები“
  - ❌ „მოხარული ვარ რომ დაგვიკავშირდით“ -> ამოღებულია (მშრალი, რობოტული მისალმება)
  - ❌ „მადლობა მომართვისთვის“ -> ამოღებულია
  - ❌ „გისურვებთ სასიამოვნო/წარმატებულ დღეს“ -> ✅ „გაახარეთ თქვენი ცუგა! ❤️“
  - ❌ „დამატებითი შეკითხვა ხომ არ გაქვთ?“ -> ამოღებულია (ქოლ-ცენტრის ტიკეტის დახურვის შაბლონი)
  - ❌ „შეგვიძლია შემოგთავაზოთ“ -> ✅ „გვაქვს“ / „გირჩევთ“
  - ❌ „მოგაწოდოთ“ -> ✅ „მოგართვათ / მოგიტანთ“ (ქართულ ენაში საკვების და სასუსნავის სწორი, თბილი ტრადიცია)
* **სისტემური დეტერმინისტული გაწმენდა:**
  - AI პასუხის გაცემის შემდეგ გააქტიურებულია regex ფილტრები `src/services/ai.js`-ში, რომლებიც ნებისმიერ გაპარულ კორპორაციულ კლიშეს ავტომატურად ცვლის თბილი, ხელოსნური ფრაზებით.

---

## 14. 50-ხარვეზიანი სისტემური გამკვრივება & სამედიცინო-ფინანსური სიზუსტე (Full Hardening Audit)
* **ფასწარმოქმნა და მიტანა:**
  - უფასო მიტანის ზღვარი ყველგან უნიფიცირებულია **45₾-ზე ან Full Pack-ზე** (სერვერიდან ამოღებულია მცდარი „2 შეკვრაზე უფასო მიტანა“).
  - Full Pack (49.50₾) პირდაპირ გასაღებულია როგორც ოთხივე პროდუქტის ნაკრები 20%-იანი ეკონომიით (62₾-ის ნაცვლად).
* **სამედიცინო და ვეტერინარული უსაფრთხოება:**
  - **საქონლის ხორცის ალერგია:** საქონელზე ალერგიულ ძაღლებს ეკრძალებათ ფილტვი, ღვიძლი და პუდრა; ეთავაზებათ მხოლოდ „დრაკონის თათები“ (ქათამი, 5+ თვიდან).
  - **ლეკვების კბილების დაცვა:** თათები რეკომენდებულია 5 თვიდან, რათა რძის კბილები არ დაუზიანდეთ; 5 თვემდე — მხოლოდ რბილი „ღრუბელი“ (ფილტვი).
  - **კატების ღვიძლის დოზირება:** A ვიტამინის ჰიპერვიტამინოზის თავიდან ასაცილებლად გაწერილია მკაცრი ლიმიტი (დღეში 1-2 პატარა კუბიკი).
  - **პანკრეატიტი და დიეტა:** მხოლოდ ჰაეროვანი საქონლის ფილტვი (~2.5% ცხიმი).
  - **ძვლის მეცნიერული უსაფრთხოება:** ახსნილია განსხვავება დაბალტემპერატურულ დეჰიდრატაციასა (ხრტილოვანი, ელასტიური) და თერმულად დამუშავებულ/მოხარშულ მყიფე ძვალს შორის.
* **ტექნიკური და Meta API გამკვრივება:**
  - `sendMessengerMessage`-ს დაემატა Meta-ს `POST_PURCHASE_UPDATE` Message Tag 24-საათიანი ფანჯრის დასაცავად.
  - ტელეფონის ნომრებს ავტომატურად ეჭრებათ `+995` პრეფიქსი და იფილტრება 9-ნიშნა ფორმატამდე.
  - Instagram-ის ღილაკები შეზღუდულია <= 20 სიმბოლომდე.
## 15. ენტერპრაიზ უსაფრთხოება & შეკვეთების ნულოვანი დანაკარგის გარანტია (Enterprise Security & Order Resilience)
* **Meta Webhook HMAC-SHA256 ვერიფიკაცია:**
  - `src/server.js`-ში `express.json({ verify: (req, res, buf) => { req.rawBody = buf; } })` მეშვეობით შენახულია დაუმუშავებელი buffer.
  - `verifyMetaSignature` ამოწმებს `x-hub-signature-256` ჰედერში შემოსულ ჰეშს `FB_APP_SECRET`-ით. ყალბი ან არაავტორიზებული რექვესთები ავტომატურად იბლოკება 403 სტატუსით.
* **Google Sheets სინქრონიზაციის Retry Queue & Telegram Emergency Backup:**
  - Vercel Serverless გარემოში `/tmp` ფაილური სისტემა დროებითია. შეკვეთის დაკარგვის პრევენციისთვის `src/services/sheets.js` აღჭურვილია 3-საფეხურიანი ავტომატური გამეორებით (exponential backoff).
  - თუ სამივე ცდა ჩავარდა, მომენტალურად იგზავნება გადაუდებელი Telegram შეტყობინება დამფუძნებელთან შეკვეთის სრული მონაცემებით (`🚨 კრიტიკული: Google Sheets-ში შეკვეთის ჩაწერა ჩავარდა!`), რითაც გარანტირებულია შეკვეთების ნულოვანი დაკარგვა.
* **100% ხელოსნური კმაყოფილების გარანტია & გემოს გადაცვლის პოლიტიკა (Unit Economics & Food Safety Protection):**
  - **სანიტარიული წესი და ზარალის პრევენცია:** გახსნილი საკვები პროდუქტი სურსათის უვნებლობის წესით უკან არ ბრუნდება (მეორედ გაყიდვა აკრძალულია), ხოლო 15₾-იანი გახსნილი შეკვრის წამოსაღებად კურიერის გაგზავნა ჯდება 5₾ (ორმაგი ზარალი: 15₾ + 5₾ = 20₾).
  - **ავტომატური ფულის დაბრუნების მკაცრი აკრძალვა:** ბოტს ეკრძალება თანხის ავტომატური დაბრუნების დაპირება ჩათში.
  - **სწორი პროტოკოლი:** პირველი შეთავაზებაა **სხვა გემოში გადაცვლა** (მაგ. ფილტვის ნაცვლად პუდრა/კუბები). ნებისმიერი პრეტენზია თანხის დაბრუნებაზე გადამისამართდება ადმინისტრატორთან (დამფუძნებელთან) ინდივიდუალურად. გაუხსნელი შეფუთვის დაბრუნებისას კურიერის ხარჯს (5₾) ფარავს კლიენტი ან მოაქვს საბურთალოზე.
