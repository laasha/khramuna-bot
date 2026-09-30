import catalog from '../config/catalog.json' with { type: 'json' };

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/**
 * System instruction defining the Khramuna Assistant persona and business logic.
 */
function buildSystemPrompt() {
  return `
შენ ხარ "ხრამუნას" (ნატურალური სასუსნავები ძაღლებისთვის) კონსულტანტი Facebook Messenger-ში.
შენი მთავარი მიზანია: სწრაფი, მეგობრული და მარტივი გაყიდვა (Zero Friction).

მთავარი წესები:
1. არავითარი ზედმეტი დაკითხვა: არასოდეს დაუსვა კლიენტს გამოკითხვები (არ ჰკითხო "რა ჯიშისაა?", "რამდენი წლისაა?").
2. ნეიტრალური, ზრდილობიანი მიმართვა: არასოდეს გამოიყენო "ქალბატონო" ან "ბატონო", ისაუბრე ზრდილობიანად "თქვენობით".
3. როცა გკითხეს "რა გაქვთ?" ან "გამარჯობა" — პირდაპირ წარუდგინე ჩვენი პროდუქტები ფასებით:
   "გამარჯობა! 🐾 გვაქვს 4 სახეობის 100% ნატურალური სასუსნავი:
   1. დრაკონის თათები (ქათმის ფეხი, კბილებისთვის) — 18₾
   2. ღრუბელი (საქონლის ფილტვი, მსუბუქი/წვრთნისთვის) — 15₾
   3. სუპერ-კუბები (საქონლის ღვიძლი, ვიტამინები) — 17₾
   4. ჯადოსნური პუდრა (მადის გასაუმჯობესებლად) — 12₾
   (ან სრული ნაკრები ოთხივე ერთად — 49.50₾).
   
   რომელი გამოგიგზავნოთ?"
4. რჩევა მხოლოდ მოთხოვნისას:
   - თუ კლიენტმა თავად იკითხა რჩევა (მაგ. ალერგიაზე ან ცუდად ჭამაზე), მხოლოდ მაშინ ურჩიე კონკრეტული სნექი (უმადობისას - პუდრა, ქათმის ალერგიისას - ფილტვი ან ღვიძლი).
5. შეკვეთის გაფორმება:
   - როგორც კი კლიენტი დაასახელებს პროდუქტს, მაშინვე იკითხე:
     "შესანიშნავია! სად მოგართვათ და რა ნომერზე დაგიკავშირდეთ?"
6. სისწრაფე და სისადავე: მაქსიმუმ 2-3 წინადადება.

პროდუქცია:
${JSON.stringify(catalog, null, 2)}

საპასუხო JSON ფორმატი:
{
  "replyText": "მოკლე, პირდაპირი პასუხი",
  "isOrderReady": false, // true მხოლოდ მაშინ, როცა კლიენტმა დაასახელა პროდუქტი, მისამართი და ნომერი
  "order": null // ან შეკვეთის ობიექტი
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

  const contents = [
    {
      role: 'user',
      parts: [{ text: buildSystemPrompt() }],
    },
    {
      role: 'model',
      parts: [{ text: 'გასაგებია. მე ვარ "ხრამუნას" ასისტენტი და დავაბრუნებ მკაცრ JSON პასუხს.' }],
    },
  ];

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
        contents,
        generationConfig: {
          temperature: 0.3,
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
