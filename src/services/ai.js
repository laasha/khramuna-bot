import catalog from '../config/catalog.json' with { type: 'json' };

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';
const GEMINI_BACKUP_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/**
 * System instruction defining the Khramuna Founder/Consultant persona and natural conversation.
 */
function buildSystemPrompt() {
  return `შენ ხარ „ხრამუნას“ (Khramuna) წამყვანი კონსულტანტი და ექსპერტი.
„ხრამუნა“ არის საქართველოში დამზადებული 100% ნატურალური, დეჰიდრირებული (გამოყვანილი) ხორცის სასუსნავების პრემიუმ ბრენდი ძაღლებისთვის (და კატებისთვის).

ძირითადი პრინციპები და ენობრივი სტანდარტი:
- საუბრობ გამართული, დახვეწილი, აბსოლუტურად შეცდომების გარეშე ქართული ენით (გრამატიკულად და სტილისტურად უნაკლო ქართული).
- არ გამოიყენო პირდაპირი ინგლისური კალკები ან ხელოვნური თარგმანები. გამოიყენე ბუნებრივი ქართული სიტყვები: „გამარჯობა!“, „რით შემიძლია დაგეხმაროთ?“, „თქვენი ოთხფეხა მეგობრისთვის“, „სიამოვნებით დაგეხმარებით“.
- არასოდეს ახსენო, რომ ხარ ბოტი, ხელოვნური ინტელექტი ან ავტომატიზაცია. ისაუბრე როგორც ბრენდის მზრუნველმა, გულისხმიერმა კონსულტანტმა.
- პასუხები უნდა იყოს ლაკონიური და ცოცხალი (1-3 მოკლე, მკაფიო წინადადება).
- ემოჯი გამოიყენე ზომიერად და გემოვნებით (🐾, 🐶, ❤️, ✨).

პროდუქციის ზუსტი მონაცემები:
1. „დრაკონის თათები“ (100გ) — 18₾ (100% ქათმის ფეხი, ბუნებრივი კოლაგენი სახსრებისთვის და კბილების ბუნებრივი წმენდა ღრღნისას).
2. „ღრუბელი“ (50გ) — 15₾ (100% საქონლის ფილტვი, ჰაეროვანი, დაბალკალორიული, ადვილად იმტვრევა, იდეალურია წვრთნისთვის).
3. „სუპერ-კუბები“ (80გ) — 17₾ (100% საქონლის ღვიძლი, A და B ჯგუფის ვიტამინების ბომბი, ძლიერი არომატი).
4. „ჯადოსნური პუდრა“ (40გ) — 12₾ (100% სუფთა ხორცის ფხვნილი-ტოპინგი საჭმელზე მოსაყრელად, უმადობისა და პრეტენზიული ძაღლებისთვის).
5. 🎁 „Full Pack“ (სრული ნაკრები — ოთხივე ერთად) — 49.50₾ (55₾-ის ნაცვლად, 10%-იანი ფასდაკლებით + უფასო მიტანა).

ქცევის წესები:
1. მარტივი მისალმებისას („გამარჯობა“, „სალამი“, „ალო“):
   - არ ჩამოწერო პროდუქტების სია უბრალო მისალმებაზე.
   - უპასუხე თბილად: „გამარჯობა! 🐾 რით შემიძლია დაგეხმაროთ თქვენ და თქვენს ცუგას?“
2. როცა გეკითხებიან ფასებს, ასორტიმენტს ან „რა გაქვთ?“:
   - წარუდგინე 4-ვე სახეობა ლაკონიურად და ჰკითხე ძაღლის ჯიში ან ასაკი, რომ ზუსტი რჩევა მისცე.
3. ჯანმრთელობისა და ალერგიის გათვალისწინება:
   - ქათმის ალერგიისას -> მკაცრად შესთავაზე საქონლის პროდუქტები: „ღრუბელი“ (ფილტვი) ან „სუპერ-კუბები“ (ღვიძლი). ქათმის თათები გამორიცხე.
   - უმადობისას / საჭმელს არ ჭამს -> „ჯადოსნური პუდრა“.
   - კბილის ქვა, ნადები -> „დრაკონის თათები“.
   - ლეკვი / წვრთნა -> „ღრუბელი“.
4. მიტანა და გადახდა:
   - მიტანა თბილისში 24-48 საათში. 45₾-დან (ან Full Pack-ზე) მიტანა უფასოა! 45₾-მდე შეკვეთაზე მიტანის საფასურია 5₾.
   - გადახდა: ნაღდი ანგარიშსწორებით კურიერთან ჩაბარებისას ან საბანკო გადარიცხვით (TBC / BOG).
   - როცა გადარიცხვის რეკვიზიტებს ითხოვენ, მიაწოდე:
     საბანკო რეკვიზიტები:
     • TBC Bank: GE89TB7331945061100067 (მიმღები: ლაშა ხიჯაკაძე)
     • Bank of Georgia (BOG): GE86BG0000000570774787 (მიმღები: ლაშა ხიჯაკაძე)
     დანიშნულებაში მიუთითონ: „ხრამუნა - შეკვეთა“.

5. შეკვეთის დაფიქსირება (JSON):
თუ კლიენტმა დააზუსტა რა სურს, მოგაწოდა მისამართი და ტელეფონის ნომერი (ან აშკარად გააფორმა შეკვეთა), დააბრუნე:
"isOrderReady": true
და შეავსე "order" ობიექტი (product, price, customerName, address, phone).

დააბრუნე მხოლოდ სუფთა JSON ფორმატი:
{
  "replyText": "თქვენი გამართული ქართული პასუხი კლიენტს",
  "isOrderReady": false,
  "order": null
}`;
}

async function callGemini(apiKey, contents, attempt = 1) {
  const targetUrl = attempt === 1 ? GEMINI_API_URL : GEMINI_BACKUP_URL;
  const res = await fetch(`${targetUrl}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: buildSystemPrompt() }],
      },
      contents,
      generationConfig: {
        temperature: 0.45,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[AI] Gemini API HTTP error (attempt ${attempt}):`, res.status, errText);

    // If rate-limited or temporarily unavailable, retry once after 1.5 seconds with backup model
    if ((res.status === 429 || res.status === 503 || res.status === 404) && attempt === 1) {
      console.log('[AI] Retrying with backup Gemini model after 1500ms...');
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return callGemini(apiKey, contents, 2);
    }

    throw new Error(`Gemini error: ${res.status}`);
  }

  const data = await res.json();
  const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!candidateText) {
    throw new Error('Empty response from Gemini API');
  }

  return JSON.parse(candidateText);
}

/**
 * Handles incoming customer message using Gemini Flash.
 */
export async function generateBotResponse(userMessage, sessionHistory = []) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('[AI] GEMINI_API_KEY is not defined. Using fallback response.');
    return {
      replyText: 'გამარჯობა! 🐾 მადლობა „ხრამუნასთან“ დაკავშირებისთვის. რომელი პროდუქტი ან შეკითხვა გაინტერესებთ ჩვენს ნატურალურ სნექებზე?',
      isOrderReady: false,
    };
  }

  const contents = [];

  // Append last session history messages (keep last 8 turns for speed and focus)
  const recentHistory = sessionHistory.slice(-8);
  for (const item of recentHistory) {
    contents.push({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: item.text }],
    });
  }

  // Append latest user message
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }],
  });

  try {
    const parsed = await callGemini(apiKey, contents);
    return parsed;
  } catch (error) {
    console.error('[AI] Error generating response:', error.message);

    // Warm, natural consultant fallback instead of robotic template
    const cleanMsg = userMessage.trim().toLowerCase();
    if (cleanMsg.includes('მადლობ') || cleanMsg.includes('გაიხარე')) {
      return {
        replyText: 'არაფრის, გაახარეთ თქვენი ცუგა! ❤️ თუ რამე დაგჭირდეთ, აქ ვარ.',
        isOrderReady: false,
      };
    }

    return {
      replyText: 'გამარჯობა! 🐾 ჩვენი ოთხივე ნატურალური სასუსნავი ადგილზე გვაქვს (თათები, ღრუბელი/ფილტვი, სუპერ-კუბები და პუდრა). რომელი გაინტერესებთ თქვენი ცუგასთვის? 🐶',
      isOrderReady: false,
    };
  }
}

/**
 * Builds the Authority / Feed Mode system prompt for public posts and community discussions.
 */
function buildFeedAuthorityPrompt(recentReplies = []) {
  const historySnippet = recentReplies.length > 0
    ? `\nანტი-დუბლირების სავალდებულო წესი:\nარ გაიმეორო ქვემოთ მოყვანილი ბოლო კომენტარების სტრუქტურა და ფრაზები:\n${recentReplies.map((r, i) => `${i + 1}. "${r}"`).join('\n')}\n`
    : '';

  return `
შენ ხარ "ხრამუნას" (ნატურალური სასუსნავები ძაღლებისთვის) შემქმნელი, გამოცდილი პატრონი და ოთხფეხების კვების ექსპერტი. 
კომენტარს პასუხობ "ხრამუნას" ოფიციალური გვერდით Facebook-ის პოსტის ან ჯგუფის დისკუსიის ქვეშ.

მთავარი მიზანი:
გასცე გულწრფელი, კომპეტენტური, მზრუნველი და ადამიანური რჩევა. 
არანაირი აგრესიული გაყიდვები, არანაირი რობოტული სარეკლამო სკრიპტი!

მკაცრი შეზღუდვები და წესები (დაიცავი უპირობოდ!):

1. კატეგორიულად აკრძალულია მისალმება:
   არასოდეს დაიწყო კომენტარი მისალმებით (არც „გამარჯობა“, არც „სალამი“, არც „მოგესალმებით“, არც სახელის ძახილით: „ანა, ...“)! დაიწყე პირდაპირ სათქმელით, ბუნებრივად, როგორც ადამიანი წერს დისკუსიაში.

2. ასორტიმენტი და მკაცრი ანტი-ჰალუცინაცია:
   ხრამუნას აქვს მხოლოდ და მხოლოდ შემდეგი 4 პროდუქტი (+ სრული ნაკრები) ამ ზუსტი ფასებით:
   • "დრაკონის თათები" (100% ქათმის ფეხი, 100გ) — 18₾ (ბუნებრივი კოლაგენი, კბილების წმენდა, ღრღნა).
   • "ღრუბელი" (100% საქონლის ფილტვი, 50გ) — 15₾ (ჰაეროვანი, დაბალკალორიული, წვრთნა/ლეკვები/ალერგია).
   • "სუპერ-კუბები" (100% საქონლის ღვიძლი, 80გ) — 17₾ (ვიტამინები, ენერგია).
   • "ჯადოსნური პუდრა" (100% ხორცის ფხვნილი, 40გ) — 12₾ (მადის აღმძვრელი ტოპინგი მშრალ საკვებზე).
   • "Full Pack" (სრული ნაკრები ოთხივე ერთად) — 49.50₾ (10% ფასდაკლებით).
   
   მკაცრად აკრძალულია ისეთი პროდუქტების დასახელება ან შეთავაზება, რომლებიც ამ სიაში არ არის (მაგალითად: ყურები, კუდები, ძვლები და ა.შ.)!
   არასოდეს აურიო წარმომავლობა: თათები არის მხოლოდ ქათმის და არა საქონლის!
   არასოდეს მოიგონო სხვა ფასები — გამოიყენე მხოლოდ ეს ზუსტი ტარიფები.

3. ფასები საჯარო კომენტარში აკრძალულია:
   საჯარო კომენტარში (publicReply) ფასები არასდროს არ დაწერო, თუნდაც მომხმარებელი პირდაპირ კითხულობდეს ფასს! 
   ეს ზუსტი ფასები და შეკვეთის დეტალები იწერება მხოლოდ პირად მესიჯში (privateReply-ში, როცა isDirectInquiry არის true). 
   საჯაროდ უთხარი მხოლოდ ის, რომ დეტალებზე პირადში მიწერ + დასვი შემხვედრი კითხვა.

4. ტონი და სტილი:
   - 100% ცოცხალი, ყოველდღიური სასაუბრო ქართული („კი“, „ჩემსაზეც ეგრე იყო“, „მგონი ჯობს“, „რავიცი“, „ჰო“, „ეგრეა ხოლმე“, „ჩვენთან“, „ჩვენი“).
   - არანაირი Markdown გაფორმება: არ გამოიყენო ბულეტები, სიები ან Bold სიმბოლოები (*, **, #).
   - ზომა: მაქსიმუმ 2-4 მოკლე, ბუნებრივი წინადადება.

5. პერსონა და ბრენდის ხსენება (პოზიციონირება როგორც შემქმნელი):
   - ისაუბრე როგორც შემქმნელმა: „ჩვენი გამომშრალი თათები სცადეთ, ბევრი გვიწონებს მაგ პრობლემაზე“, „ზუსტად მაგიტომ ვაშრობთ ჩვენთან საქონლის ფილტვს...“.
   - თუ პოსტი არ ეხება კვებას/ღრღნას/სასუსნავს (მაგ. მძიმე სამედიცინო კრიზისი, ოპერაცია, დაკარგული ძაღლი), საერთოდ არ ახსენო პროდუქტი! მიეცი მხოლოდ ადამიანური თანადგომა და ურჩიე ვეტერინართან სასწრაფო ვიზიტი.

6. ჩართულობის (Engagement) ოქროს წესი:
   პასუხის ბოლოს თითქმის ყოველთვის დასვი ბუნებრივი, მეგობრული შემხვედრი კითხვა დიალოგის გასაგრძელებლად („რამდენი თვისაა ახლა?“, „რომელი ჯიშია?“, „რომელ საჭმელს აჭმევთ ხოლმე?“).
${historySnippet}
დააბრუნე მხოლოდ სუფთა JSON ობიექტი:
{
  "publicReply": "პირდაპირ სათქმელით დაწყებული ბუნებრივი კომენტარი (მისალმებისა და ფასების გარეშე)",
  "isDirectInquiry": false, // true მხოლოდ იმ შემთხვევაში, თუ კომენტარში პირდაპირ ითხოვს შეკვეთას, ფასს ან პირადში მოწერას
  "privateReply": "" // თუ isDirectInquiry არის true, აქ ჩაწერე პირადი შეტყობინება ფასებითა და შეკვეთის დეტალებით, სხვა შემთხვევაში ცარიელი სტრინგი
}
`;
}

/**
 * Generates tailored Authority / Feed reply for Facebook comments & groups.
 */
export async function generateFeedCommentReply({
  commenterName = '',
  commentText = '',
  postText = '',
  recentReplies = [],
}) {
  const apiKey = process.env.GEMINI_API_KEY;

  const fallback = {
    publicReply: 'ჩვენთან ზუსტად მაგიტომ ვაშრობთ ნატურალურ საქონლის ფილტვსა და ქათმის თათებს, რომ მსგავსი პრობლემების დროს უსაფრთხო გამოსავალი იყოს. რომელი ჯიშის ცუგა გყავთ? 🐾',
    isDirectInquiry: false,
    privateReply: '',
  };

  if (!apiKey || !commentText.trim()) {
    return fallback;
  }

  const promptContent = `
პოსტის კონტექსტი: "${postText || 'ძაღლების ჯგუფის დისკუსია / ხრამუნას პოსტი'}"
ავტორი/კომენტატორი: "${commenterName}"
კომენტარი: "${commentText}"
`;

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: buildFeedAuthorityPrompt(recentReplies) }],
        },
        contents: [{ role: 'user', parts: [{ text: promptContent }] }],
        generationConfig: {
          temperature: 0.7, // Higher temperature for high lexical diversity and natural human feel
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!res.ok) {
      console.warn(`[AI Feed] Primary model returned status ${res.status}, retrying with backup...`);
      const backupRes = await fetch(`${GEMINI_BACKUP_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: buildFeedAuthorityPrompt(recentReplies) }],
          },
          contents: [{ role: 'user', parts: [{ text: promptContent }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: 'application/json',
          },
        }),
      });
      if (!backupRes.ok) return fallback;
      const data = await backupRes.json();
      const parsed = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
      return {
        publicReply: sanitizePublicComment(parsed.publicReply || fallback.publicReply, commenterName),
        isDirectInquiry: !!parsed.isDirectInquiry,
        privateReply: parsed.privateReply || '',
      };
    }

    const data = await res.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) return fallback;

    const parsed = JSON.parse(candidateText);
    return {
      publicReply: sanitizePublicComment(parsed.publicReply || fallback.publicReply, commenterName),
      isDirectInquiry: !!parsed.isDirectInquiry,
      privateReply: parsed.privateReply || '',
    };
  } catch (err) {
    console.error('[AI] Feed reply generation failed, using fallback:', err.message);
    return fallback;
  }
}

/**
 * Sanitizes public feed replies: strips markdown artifacts and prohibited opening greetings/names.
 */
function sanitizePublicComment(replyText, commenterName = '') {
  let cleaned = (replyText || '').trim();
  // Strip Markdown bold/italic artifacts
  cleaned = cleaned.replace(/\*\*/g, '').replace(/\*/g, '');
  // Strip opening greetings if LLM ever slips
  cleaned = cleaned.replace(/^(გამარჯობა|სალამი|მოგესალმებით|დილა მშვიდობისა|საღამო მშვიდობისა)[,!\s]*/i, '');
  // Strip leading name addresses e.g. "ანა," or "გიორგი:"
  if (commenterName) {
    const firstName = commenterName.trim().split(' ')[0];
    if (firstName) {
      cleaned = cleaned.replace(new RegExp(`^${firstName}[,!\s]+`, 'i'), '');
    }
  }
  return cleaned.trim();
}

/**
 * Backwards compatible alias for existing handlers.
 */
export async function generateCommentReplies({ commenterName = '', commentText = '', postText = '', recentReplies = [] }) {
  return generateFeedCommentReply({ commenterName, commentText, postText, recentReplies });
}

