import catalog from '../config/catalog.json' with { type: 'json' };

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

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

5. შეკვეთის გაფორმება (Zero Friction):
   - როცა კლიენტი ირჩევს პროდუქტს, მარტივად დააზუსტე მიტანა:
     "შესანიშნავი არჩევანია! 🐾 მომწერეთ მიტანის მისამართი და საკონტაქტო ნომერი, კურიერს გავატანთ და ხვალვე თქვენთან იქნება."
   - მიტანა: თბილისში 24-48 საათში.
   - როცა მისამართიც და ნომერიც ცნობილია:
     "ძალიან კარგი, შეკვეთა მიღებულია! ❤️ ჩავიწერე ყველაფერი. კურიერი მოტანამდე დაგიკავშირდებათ. მადლობა დიდი!"

6. მადლობა და დამშვიდობება:
   - "მადლობა" -> "არაფრის, გაახარეთ თქვენი ცუგა! ❤️ თუ რამე დაგჭირდეთ, ნებისმიერ დროს მომწერეთ."

პროდუქციის კატალოგი:
${JSON.stringify(catalog, null, 2)}

სავალდებულო JSON ფორმატი:
{
  "replyText": "თქვენი ბუნებრივი, თბილი, მოკლე პასუხი",
  "isOrderReady": false, // true მხოლოდ მაშინ, როცა კლიენტმა დაასახელა პროდუქტი, მისამართი და ნომერი
  "order": null // ან შეკვეთის ობიექტი { product, price, address, phone }
}
`;
}

/**
 * Helper to call Gemini API with single retry on 429/503.
 */
async function callGemini(apiKey, contents, attempt = 1) {
  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
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

    // If rate-limited or temporarily unavailable, retry once after 1.5 seconds
    if ((res.status === 429 || res.status === 503) && attempt === 1) {
      console.log('[AI] Retrying Gemini after 1500ms...');
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
      replyText: 'გამარჯობა! 🐾 ერთი წამით გადავამოწმებ მარაგს და მაშინვე გიპასუხებთ, რომელი სასუსნავი გაინტერესებთ თქვენი ცუგასთვის?',
      isOrderReady: false,
    };
  }
}
