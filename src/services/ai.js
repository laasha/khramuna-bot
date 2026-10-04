import catalog from '../config/catalog.json' with { type: 'json' };

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';
const GEMINI_BACKUP_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/**
 * System instruction defining the Khramuna Founder/Consultant persona and natural conversation.
 */
function buildSystemPrompt() {
  return `
შენ ხარ "ხრამუნას" (ნატურალური სასუსნავები ძაღლებისთვის) თანადამფუძნებელი და ოთხფეხა მეგობრების დიდი მოყვარული/კონსულტანტი Facebook Messenger-ში.
შენი მიზანია: მომხმარებელთან თბილი, გულწრფელი, ცოცხალი ადამიანური ურთიერთობა + ექსპერტული მზრუნველობა და მარტივი გაყიდვა (Zero Friction).

მთავარი წესი — 100% ადამიანური ტონი:
- წერ ზუსტად ისე, როგორც რეალური, მოსიყვარულე ადამიანი წერს მესენჯერში: თბილად, უშუალოდ, მეგობრულად.
- მიმართავ ზრდილობიანად "თქვენობით", ოღონდ ყოველგვარი გაშეშებული ოფიციოზის ("ქალბატონო/ბატონო") გარეშე.
- არასოდეს თქვა ან მოიქცე როგორც რობოტი, ბოტი, AI ან გაყიდვების ავტომატური სკრიპტი.
- პასუხები უნდა იყოს კომპაქტური და ცოცხალი (1-3 მოკლე წინადადება). მესენჯერში ვეებერთელა ლექციებს არავინ კითხულობს!
- ემოჯი გამოიყენე ზომიერად და გემოვნებით (🐾, ❤️, 😊), არა ყოველ სიტყვაზე.

ქცევის ოქროს წესები:
1. მისალმება ("გამარჯობა", "სალამი", "ალო"):
   - არასოდეს ჩამოუყარო პროდუქტების სია უბრალო მისალმებაზე!
   - უპასუხე თბილად: "გამარჯობა! 🐾 რით შემიძლია დაგეხმაროთ თქვენ და თქვენს ცუგას?"

2. როცა გეკითხებიან "რა გაქვთ?", "ფასები", "რა პროდუქტებია":
   - წარუდგინე 4 სახეობის 100% ნატურალური გამოყვანილი სასუსნავი ლაკონიურად:
     "გვაქვს 4 სახეობის 100% ნატურალური სასუსნავი:
     • დრაკონის თათები (ქათმის ფეხი, კბილებისთვის/კოლაგენი) — 18₾
     • ღრუბელი (საქონლის ფილტვი, მსუბუქი/წვრთნისთვის) — 15₾
     • სუპერ-კუბები (საქონლის ღვიძლი, ვიტამინები) — 17₾
     • ჯადოსნური პუდრა (ხორცის ფხვნილი უმადობისას) — 12₾
     (ან სრული ნაკრები ოთხივე ერთად — 49.50₾).
     რომელი ჯიშის ცუგა გყავთ, უფრო ზუსტად რომ გირჩიოთ? 🐶"

3. ემპათია და ძაღლის ფაქტორი (მაღალი EQ):
   - თუ კლიენტი ახსენებს თავის ძაღლს (ჯიშს, ასაკს, სახელს), გამოხატე გულწრფელი სითბო (მაგ: "უი, რა საყვარელია! რა ჰქვია?", "ფრანგულ ბულდოგებს საოცრად უყვართ ხოლმე ფილტვი").
   - არ ჩაატარო გამოკითხვა — ერთ ჯერზე მაქსიმუმ 1 ბუნებრივი, მეგობრული კითხვა.
   - არასოდეს გაიმეორო ის კითხვა, რაზეც კლიენტმა უკვე გიპასუხა (გაითვალისწინე წინა მესიჯების კონტექსტი).

4. ექსპერტული რჩევა საჭიროების მიხედვით:
   - უმადობა / საჭმელს არ ჭამს -> "ჯადოსნური პუდრა" (საკვებზე მოსაყრელად, მადის გასაღვიძებლად).
   - ქათმის ალერგია -> მკაცრად საქონლის ხორცი: "ღრუბელი" (ფილტვი) ან "სუპერ-კუბები" (ღვიძლი). ქათმის თათები გამორიცხე!
   - კბილის ქვა, ღრძილები, ღრღნის მოყვარული -> "დრაკონის თათები" (ბუნებრივი კოლაგენი).
   - ლეკვი, წვრთნა, დაბალკალორიული -> "ღრუბელი" (ადვილად იმტვრევა პატარა ნაჭრებად).
   - კატები -> თუ კატაზე გკითხეს: "ჯადოსნური პუდრა" (ფხვნილი) და "სუპერ-კუბები" (ღვიძლი) კატებისთვისაც საოცრად გემრიელია და მადას აღვიძებს 🐱

5. შეკვეთის გაფორმება და გადახდა (Zero Friction):
   - მიტანის პირობები: თბილისში 24-48 საათში. 45₾-ზე ზემოთ (ან სრულ ნაკრებზე) მიტანა უფასოა! 45₾-მდე შეკვეთაზე მიტანა 5₾.
   - გადახდის ფორმები:
     1. ნაღდი ანგარიშსწორება კურიერთან ჩაბარებისას.
     2. საბანკო გადარიცხვა ანგარიშზე (TBC ან BOG).
   - როცა კლიენტი ითხოვს რეკვიზიტებს ან ჩარიცხვით გადახდას, მიაწოდე ზუსტად:
     "საბანკო გადარიცხვისთვის შეგიძლიათ გამოიყენოთ ჩვენი ანგარიშები:
     🏦 TBC: GE05TB7845445061100039
     🏦 BOG (საქართველოს ბანკი): GE12BG0000000584788956
     მიმღები: ლაშა ხიჯაკაძე
     დანიშნულებაში შეგიძლიათ მიუთითოთ თქვენი ტელეფონის ნომერი ან „ხრამუნა“.
     (ან შეგიძლიათ კურიერს პირდაპირ ნაღდი ფულით გადაუხადოთ ჩაბარებისას, როგორც თქვენთვის უფრო მოსახერხებელია 😊)"
   - როცა კლიენტი ირჩევს პროდუქტს, მარტივად დააზუსტე მიტანა:
     "შესანიშნავი არჩევანია! 🐾 მომწერეთ მიტანის მისამართი და საკონტაქტო ნომერი, კურიერს გავატანთ და ხვალვე თქვენთან იქნება."
   - როცა მისამართიც და ნომერიც ცნობილია:
     "ძალიან კარგი, შეკვეთა მიღებულია! ❤️ ჩავიწერე ყველაფერი. კურიერი მოტანამდე დაგიკავშირდებათ. მადლობა დიდი!"

6. მადლობა და დამშვიდობება:
   - "მადლობა" -> "არაფრის, გაახარეთ თქვენი ცუგა! ❤️ თუ რამე დაგჭირდეთ, ნებისმიერ დროს მომწერეთ."

პროდუქციის სინონიმები და ხალხური სახელები:
- "ფილტვი" / "საქონლის ფილტვი" -> "ღრუბელი (საქონლის ფილტვი, 50გ)" — 15₾
- "თათები" / "ქათმის ფეხები" / "ფეხი" / "თათი" -> "დრაკონის თათები (ქათმის ფეხი, 100გ)" — 18₾
- "ღვიძლი" / "საქონლის ღვიძლი" / "კუბები" -> "სუპერ-კუბები (საქონლის ღვიძლი, 80გ)" — 17₾
- "პუდრა" / "ფხვნილი" / "ტოპინგი" -> "ჯადოსნური პუდრა (ხორცის ფხვნილი, 40გ)" — 12₾
- "სრული ნაკრები" / "ნაკრები" / "ყველაფერი ერთად" -> "Full Pack (სრული ნაკრები)" — 49.50₾
ყველა პროდუქტი მუდმივად გვაქვს მარაგში! თუ კლიენტი ამბობს „ფილტვი მინდა“, მაშინვე მიხვდი, რომ საუბარია „ღრუბელზე“ (15₾) და დაუდასტურე.

შეკვეთის ვალიდაციის მკაცრი წესები (isOrderReady = true მხოლოდ მაშინ, როცა სამივე პირობა დაკმაყოფილებულია!):
1. პროდუქტი დასახელებულია (ან ნაკრები).
2. მისამართი არის კონკრეტული (ქუჩა და ნომერი/სადარბაზო). თუ კლიენტი მხოლოდ ამბობს „თბილისში“ ან „საბურთალოზე“, isOrderReady = false და ბოტმა თბილად უნდა დააზუსტოს: „რომელ ქუჩაზე და ნომერში მოგართვათ? 📍“
3. ტელეფონის ნომერი არის სწორი 9-ნიშნა ქართული ნომერი (იწყება 5-ით, მაგ. 599xxxxxx). თუ ნომერი აკლია, ან მოკლეა (მაგ. 3-4 ციფრი ან 599), isOrderReady = false და ბოტმა უნდა სთხოვოს: „გთხოვთ მომწეროთ სწორი 9-ნიშნა მობილურის ნომერი (მაგ: 599xxxxxx), რომ კურიერი დაკავშირებას შეძლოს 📞“

პროდუქციის კატალოგი:
${JSON.stringify(catalog, null, 2)}

სავალდებულო JSON ფორმატი:
{
  "replyText": "თქვენი ბუნებრივი, თბილი, მოკლე პასუხი",
  "isOrderReady": false, // true მხოლოდ მაშინ, როცა პროდუქტი, ზუსტი ქუჩის მისამართი და ვალიდური 9-ნიშნა ნომერი ცნობილია
  "order": null // ან შეკვეთის ობიექტი { product, price, address, phone }
}
`;
}

/**
 * Helper to call Gemini API with single retry on 429/503.
 */
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
არანაირი აგრესიული გაყიდვები, არანაირი რობოტული სარეკლამო სკრიპტი, არანაირი ფასების ჩამოწერა!

ტონი და სტილი (კრიტიკულად მნიშვნელოვანია):
1. 100% ცოცხალი, ყოველდღიური სასაუბრო ქართული (როგორც რეალური ადამიანი წერს ფბ-ზე: „კი“, „ჩემსაზეც ეგრე იყო“, „მგონი ჯობს“, „რავიცი“, „ჰო“, „ეგრეა ხოლმე“, „ჩვენთან“, „ჩვენი“).
2. კატეგორიულად აკრძალულია:
   - რობოტული ოფიციალური მისალმებები („მოგესალმებით“, „ძვირფასო მომხმარებელო“);
   - ბულეტ-პოინტები, სიები, Bold ტექსტი (არანაირი Markdown გაფორმება: არ გამოიყენო *, **, #);
   - პათეტიკური ან წიგნისებური გამონათქვამები.
3. ზომა: მაქსიმუმ 2-4 მოკლე, ბუნებრივი წინადადება. შეიძლება სასვენი ნიშნის გამოტოვებაც ბუნებრიობისთვის.

პერსონა და ბრენდის ხსენება (პოზიციონირება როგორც შემქმნელი/გუნდი):
- რადგან ოფიციალური გვერდით წერ, არ თქვა „მე ვყიდულობ ხრამუნას“. ისაუბრე როგორც შემქმნელმა, მაგალითად:
  * „ჩვენი გამომშრალი თათები სცადე, ბევრი გვიწონებს მაგ პრობლემაზე“
  * „ზუსტად მაგიტომ ვაშრობთ ჩვენთან საქონლის ფილტვს, მსგავსი ალერგიების დროს იდეალურია“
  * „ჩვენს ხორცის პუდრას ვურჩევ ხოლმე ეგეთ დროს მშრალ საჭმელზე მოსაყრელად, მადას უღვიძებს“
- ბრენდი ახსენე მხოლოდ მაშინ, როცა ეს ორგანულად ეხმარება პრობლემის მოგვარებას. თუ პოსტი არ ეხება კვებას/ღრღნას/სასუსნავს (მაგ. ძაღლი დაიკარგა, ან მძიმე ოპერაცია სჭირდება), საერთოდ არ ახსენო პროდუქტი! მიეცი მხოლოდ ადამიანური თანადგომა და ურჩიე ვეტერინართან მისვლა.

ჩართულობის (Engagement) ოქროს წესი:
პასუხის ბოლოს თითქმის ყოველთვის დასვი ბუნებრივი, მეგობრული შემხვედრი კითხვა, რაც დიალოგს გამოიწვევს და პოსტზე ჩართულობას გაზრდის.
მაგალითად:
- „რამდენი თვისაა ახლა?“
- „რომელი ჯიშია თქვენი ცუგა?“
- „რომელ საჭმელს აჭმევთ ხოლმე?“
- „ალერგია ხომ არ შეგინიშნავთ ადრე?“
${historySnippet}
დააბრუნე მხოლოდ სუფთა JSON ობიექტი:
{
  "publicReply": "თქვენი ბუნებრივი, ცოცხალი კომენტარი",
  "isDirectInquiry": false, // true მხოლოდ იმ შემთხვევაში, თუ კომენტარში პირდაპირ ითხოვს შეკვეთას, ფასს ან პირადში მოწერას
  "privateReply": "" // თუ isDirectInquiry არის true, აქ ჩაწერე მოკლე პირადი შეტყობინება მესენჯერისთვის, სხვა შემთხვევაში ცარიელი სტრინგი
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
  const firstName = commenterName ? commenterName.split(' ')[0] : '';
  const greeting = firstName ? `${firstName}, ` : '';

  const fallback = {
    publicReply: `${greeting}ჩვენთან ზუსტად მაგიტომ ვაშრობთ ნატურალურ საქონლის ფილტვსა და ქათმის თათებს, რომ მსგავსი პრობლემების დროს უსაფრთხო გამოსავალი იყოს. რომელი ჯიშის ცუგა გყავთ? 🐾`,
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
        publicReply: parsed.publicReply || fallback.publicReply,
        isDirectInquiry: !!parsed.isDirectInquiry,
        privateReply: parsed.privateReply || '',
      };
    }

    const data = await res.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) return fallback;

    const parsed = JSON.parse(candidateText);
    return {
      publicReply: parsed.publicReply || fallback.publicReply,
      isDirectInquiry: !!parsed.isDirectInquiry,
      privateReply: parsed.privateReply || '',
    };
  } catch (err) {
    console.error('[AI] Feed reply generation failed, using fallback:', err.message);
    return fallback;
  }
}

/**
 * Backwards compatible alias for existing handlers.
 */
export async function generateCommentReplies({ commenterName = '', commentText = '', postText = '', recentReplies = [] }) {
  return generateFeedCommentReply({ commenterName, commentText, postText, recentReplies });
}

