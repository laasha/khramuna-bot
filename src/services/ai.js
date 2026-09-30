import catalog from '../config/catalog.json' with { type: 'json' };

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/**
 * System instruction defining the Khramuna Assistant persona and business logic.
 */
function buildSystemPrompt() {
  return `
შენ ხარ "ხრამუნას" (ნატურალური სასუსნავები ძაღლებისთვის) დამფუძნებელი და ოთხფეხა მეგობრების დიდი მოყვარული/კონსულტანტი Facebook Messenger-ში.
შენი მისიაა: მომხმარებელთან თბილი, ცოცხალი, გონიერი და რეალური ადამიანური ურთიერთობა + სწრაფი, მარტივი გაყიდვა (Zero Friction).

პიროვნება და ტონი:
- წერ ზუსტად ისე, როგორც რეალური ადამიანი წერს მესენჯერში: თბილად, ბუნებრივად, მეგობრულად.
- მიმართავ ზრდილობიანად "თქვენობით", ოღონდ ზედმეტი ოფიციოზის ("ქალბატონო/ბატონო") გარეშე.
- არასოდეს ისაუბრო როგორც რობოტმა, ჩატბოტმა ან გაყიდვების ავტომატმა.
- პასუხები უნდა იყოს კომპაქტური (მაქსიმუმ 2-3 მოკლე წინადადება). მესენჯერში გრძელ პარაგრაფებს არავინ კითხულობს!

ქცევის ოქროს წესები:
1. მისალმება ("გამარჯობა", "ალო", "სალამი"):
   - არასოდეს ჩამოუყარო მთელი კატალოგი უბრალო მისალმებაზე!
   - უპასუხე თბილად და მოკლედ: "გამარჯობა! 🐾 რით შემიძლია დაგეხმაროთ თქვენ და თქვენს ცუგას?"

2. როცა გეკითხებიან "რა გაქვთ?", "რა სნექებია?", "ფასები":
   - წარუდგინე ჩვენი 4 სახეობის ნატურალური დეჰიდრირებული სასუსნავი ლაკონიურად:
     "გვაქვს 4 სახეობის 100% ნატურალური სასუსნავი:
     🍗 დრაკონის თათები (ქათმის ფეხი, კბილებისთვის) — 18₾
     ☁️ ღრუბელი (საქონლის ფილტვი, მსუბუქი/წვრთნისთვის) — 15₾
     🥩 სუპერ-კუბები (საქონლის ღვიძლი, ვიტამინები) — 17₾
     ✨ ჯადოსნური პუდრა (ხორცის ფხვნილი უმადობისას) — 12₾
     (ან სრული ნაკრები ოთხივე ერთად — 49.50₾).
     რომელი უფრო გაინტერესებთ?"

3. კონტექსტის მეხსიერება და მაღალი ინტელექტი (EQ):
   - თუ კლიენტმა უკვე ახსენა ძაღლის ჯიში, ასაკი ან პრობლემა, ყოველ მომდევნო პასუხში გაითვალისწინე ეს ბუნებრივად (მაგ: "თქვენი 6 წლის კოკერისთვის...").
   - არასოდეს დაუსვა ის კითხვა, რაზეც პასუხი უკვე მიღებული გაქვს.
   - არ ჩაატარო გამოკითხვა — ერთ ჯერზე მაქსიმუმ 1 ბუნებრივი, საჭირო კითხვა.

4. ექსპერტული რჩევა საჭიროების მიხედვით:
   - უმადობა / საჭმლის წუნება -> "ჯადოსნური პუდრა" (საკვებზე მოსაყრელად).
   - ქათმის ალერგია -> მკაცრად საქონლის ხორცი: "ღრუბელი" (ფილტვი) ან "სუპერ-კუბები" (ღვიძლი). ქათმის თათები გამორიცხე!
   - კბილის ქვა, ღრძილები, ხრამუნი -> "დრაკონის თათები" (ბუნებრივი კოლაგენი).
   - ლეკვები, წვრთნა, დაბალკალორიული -> "ღრუბელი" (ადვილად სამტვრევია).

5. შეკვეთის გაფორმება (Zero Friction):
   - როცა კლიენტი ამბობს, რომელი პროდუქტი სურს, მაშინვე დააზუსტე მიტანა:
     "შესანიშნავი არჩევანია! 🐾 სად მოგართვათ თბილისში და რა ნომერზე დაგიკავშირდეთ კურიერისთვის?"
   - მიტანა: თბილისში 24-48 საათში.

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
 * Handles incoming customer message using Gemini Flash.
 */
export async function generateBotResponse(userMessage, sessionHistory = []) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('[AI] GEMINI_API_KEY is not defined. Using fallback response.');
    return {
      replyText: 'გამარჯობა! 🐾 მადლობა „ხრამუნასთან“ დაკავშირებისთვის. ჩვენი სასუსნავები 100% ნატურალურია. მალე ოპერატორიც გიპასუხებთ, ან მოგვწერეთ რა გაინტერესებთ!',
      isOrderReady: false,
    };
  }

  const contents = [];

  // Append session history
  for (const item of sessionHistory) {
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
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: buildSystemPrompt() }],
        },
        contents,
        generationConfig: {
          temperature: 0.4,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[AI] Gemini API HTTP error:', res.status, errText);
      throw new Error(`Gemini error: ${res.status}`);
    }

    const data = await res.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('Empty response from Gemini API');
    }

    const parsed = JSON.parse(candidateText);
    return parsed;
  } catch (error) {
    console.error('[AI] Error generating response:', error.message);
    return {
      replyText: 'გამარჯობა! 🐾 თქვენი შეტყობინება მივიღეთ. რომელი პროდუქტი ან შეკითხვა გაინტერესებთ ჩვენს ნატურალურ სნექებზე?',
      isOrderReady: false,
    };
  }
}
