import { getOrders, updateOrder, getCustomerProfile, updateSession, isBotPausedForUser, getAllSessions, saveSessions, getUserLatestOrder } from './storage.js';
import { sendQuickReplies, sendSenderAction, sendMessengerMessage } from './facebook.js';
import { notifyTelegramAlert } from './telegram.js';

/**
 * Checks all orders and sends gentle Post-Purchase Care & Retention messages
 * STRICTLY to orders that have been verified and marked as 'DELIVERED'.
 * 
 * 2-Tier Retention Architecture:
 * - Tier 1: Day 3 Care Check-in (24 to 96 hours post-delivery)
 * - Tier 2: Day 16 Smart Restock Reminder (14 to 22 days post-delivery)
 */
export async function checkAndSendPostDeliveryFollowUps() {
  const orders = getOrders();
  const now = Date.now();
  let sentCount = 0;

  for (const order of orders) {
    if (order.status !== 'DELIVERED' || !order.deliveredAt) continue;
    if (isBotPausedForUser(order.userId)) continue;

    const deliveredMs = new Date(order.deliveredAt).getTime();
    if (isNaN(deliveredMs)) continue;
    const hoursElapsed = (now - deliveredMs) / (1000 * 60 * 60);
    const daysElapsed = hoursElapsed / 24;

    // Tier 1: Care Check-in (1 to 4 days post-delivery)
    if (!order.followUpSent && hoursElapsed >= 24 && hoursElapsed <= 96) {
      const success = await sendSingleOrderFollowUp(order);
      if (success) sentCount++;
    }

    // Tier 2: Smart Restock Reminder (14 to 22 days post-delivery)
    if (order.followUpSent && !order.restockReminderSent && daysElapsed >= 14 && daysElapsed <= 22) {
      const success = await sendRestockReminder(order);
      if (success) sentCount++;
    }
  }

  return sentCount;
}

/**
 * Helper to decline pet names in Georgian Dative Case (მიცემითი ბრუნვა):
 * „ბობი“ -> „ბობის“, „მაქსი“ -> „მაქსს“, „ჯეკი“ -> „ჯეკის“
 */
function getDativePetSubject(petName) {
  if (!petName || typeof petName !== 'string') return 'თქვენს ცუგას';
  const clean = petName.trim();
  if (!clean) return 'თქვენს ცუგას';

  if (clean.endsWith('ი')) {
    return clean.slice(0, -1) + 'ის';
  } else if (clean.endsWith('ა') || clean.endsWith('ე') || clean.endsWith('ო') || clean.endsWith('უ')) {
    return clean + '-ს';
  }
  return clean + '-ს';
}

/**
 * Tier 1: Post-delivery care check-in (Day 3)
 */
export async function sendSingleOrderFollowUp(order) {
  if (!order || !order.userId) return false;

  const profile = getCustomerProfile(order.userId) || {};
  const customerName = (order.customerName || profile.name || '').split(' ')[0].trim();
  const petName = profile.petName || '';

  const petSubject = getDativePetSubject(petName);
  
  const text = `მოგესალმებით${customerName ? ` ${customerName}` : ''}! 🐾 მოგიკითხეთ „ხრამუნას“ სახელოსნოდან.\n\nროგორ მოეწონა ${petSubject} ჩვენი სასუსნავი? ხომ არ გაუჭირდა დაღეჭვა ან რაიმე კითხვა ხომ არ გაქვთ? ❤️\n\n(შეგახსენებთ: თუ ${petSubject} მოკლე სთორის/ვიდეოს გადაუღებთ და დაგვთაგავთ, მომდევნო შეკვეთაზე 10%-იან ფასდაკლებას ან უფასო მიტანას გაჩუქებთ! 🐾)`;

  const pills = [
    { title: '😍 ძალიან მოეწონა!', payload: 'FEEDBACK_LOVED_IT' },
    { title: '🤔 რჩევა მჭირდება', payload: 'FEEDBACK_NEED_ADVICE' }
  ];

  try {
    await sendSenderAction(order.userId, 'typing_on').catch(() => {});
    const res = await sendQuickReplies(order.userId, text, pills);
    if (res) {
      updateSession(order.userId, 'assistant', text);
      updateOrder(order.id, {
        followUpSent: true,
        followUpSentAt: new Date().toISOString()
      });

      await notifyTelegramAlert(
        '💌 *Care Check-in (Day 3) გაეგზავნა კლიენტს*',
        `👤 კლიენტი: ${order.customerName || order.userId}\n🐶 ცუგა: ${petName || 'ცუგა'}\n📦 შეკვეთა: ${order.product} (${order.id})\n\nბოტმა გაუგზავნა მზრუნველი მოკითხვა ჩაბარების შემდეგ.`
      );
      return true;
    }
  } catch (err) {
    console.error(`[FollowUp] Error sending to ${order.userId}:`, err.message);
  }
  return false;
}

/**
 * Tier 2: Smart Restock Reminder (Day 16)
 */
export async function sendRestockReminder(order) {
  if (!order || !order.userId) return false;

  const profile = getCustomerProfile(order.userId) || {};
  const customerName = (order.customerName || profile.name || '').split(' ')[0].trim();
  const petName = profile.petName || '';
  const petSubject = petName ? `${petName}-ს` : 'თქვენს ცუგას';

  const text = `გამარჯობა${customerName ? ` ${customerName}` : ''}! 🐾 მოგიკითხეთ „ხრამუნას“ საწარმოდან.\n\nალბათ ${petSubject} უკვე ეწურება სასუსნავების მარაგი. ხომ არ გსურთ ახალი პარტიიდან გაგიმზადოთ? ❤️`;

  const pills = [
    { title: '🐾 დიახ, იგივე შეკვეთა!', payload: 'RESTOCK_SAME_ORDER' },
    { title: '✨ სხვა გემო მინდა', payload: 'RESTOCK_NEW_TASTE' },
    { title: 'მადლობა, ჯერ გვაქვს', payload: 'RESTOCK_STILL_HAVE' }
  ];

  try {
    await sendSenderAction(order.userId, 'typing_on').catch(() => {});
    const res = await sendQuickReplies(order.userId, text, pills);
    if (res) {
      updateSession(order.userId, 'assistant', text);
      updateOrder(order.id, {
        restockReminderSent: true,
        restockReminderSentAt: new Date().toISOString()
      });

      await notifyTelegramAlert(
        '🔁 *Smart Restock (Day 16) გაეგზავნა კლიენტს*',
        `👤 კლიენტი: ${order.customerName || order.userId}\n🐶 ცუგა: ${petName || 'ცუგა'}\n📦 წინა შეკვეთა: ${order.product} (${order.id})\n\nბოტმა შესთავაზა მარაგის შევსება ახალი პარტიიდან.`
      );
      return true;
    }
  } catch (err) {
    console.error(`[RestockReminder] Error sending to ${order.userId}:`, err.message);
  }
  return false;
}

/**
 * Automatically checks for abandoned / silent conversations (3 to 24 hours of silence)
 * where the customer received information or a recommendation but went silent.
 * Sends a gentle, low-pressure recovery check-in during polite daytime hours (10:00 - 20:30 UTC+4).
 */
export async function checkAndRecoverGhostConversations() {
  const sessions = getAllSessions();
  const now = Date.now();
  let recoveredCount = 0;

  // Local Georgia time check (UTC+4): polite waking hours are 10:00 to 20:30
  const currentHourUTC = new Date().getUTCHours();
  const geoHour = (currentHourUTC + 4) % 24;

  if (geoHour < 10 || geoHour >= 21) {
    console.log(`[GhostRecovery] Outside polite daytime hours in Georgia (current hour: ${geoHour}:00). Skipping.`);
    return 0;
  }

  const updatedSessions = { ...sessions };
  let hasChanges = false;

  for (const [userId, session] of Object.entries(sessions)) {
    if (!session || !session.history || session.history.length === 0) continue;
    if (session.ghostRecoverySent) continue;
    if (isBotPausedForUser(userId)) continue;

    // Check if customer already placed an order recently
    const latestOrder = getUserLatestOrder(userId);
    if (latestOrder && (now - new Date(latestOrder.createdAt).getTime() < 36 * 60 * 60 * 1000)) {
      continue;
    }

    // Check last activity: between 3 hours and 24 hours ago
    const lastActivity = session.lastActivity || (session.history[session.history.length - 1].timestamp ? new Date(session.history[session.history.length - 1].timestamp).getTime() : 0);
    const hoursElapsed = (now - lastActivity) / (1000 * 60 * 60);

    if (hoursElapsed >= 3 && hoursElapsed <= 24) {
      // Ensure the last message was from assistant (customer went silent after receiving information)
      const lastMsg = session.history[session.history.length - 1];
      if (lastMsg && (lastMsg.role === 'assistant' || lastMsg.sender === 'assistant')) {
        const text = 'გამარჯობა! 🐾 ხომ არ დაგრჩათ რაიმე კითხვა თქვენი ცუგას რაციონზე? თუ ჯერ ფიქრობთ, სრულიად გასაგებია — ნებისმიერ დროს მოგვწერეთ და სიამოვნებით დაგეხმარებით ❤️';
        try {
          await sendSenderAction(userId, 'typing_on').catch(() => {});
          const sent = await sendMessengerMessage(userId, text);
          if (sent) {
            updateSession(userId, 'assistant', text);
            updatedSessions[userId] = {
              ...session,
              ghostRecoverySent: true,
              ghostRecoverySentAt: new Date().toISOString()
            };
            hasChanges = true;
            recoveredCount++;

            await notifyTelegramAlert(
              '👻 *Ghost Recovery: მიტოვებული ჩათის მოკითხვა გაიგზავნა*',
              `👤 კლიენტი (ID): \`${userId}\`\n💬 ბოტმა გაუგზავნა რბილი მოკითხვა გაჩუმებულ მომხმარებელს (გავიდა ${hoursElapsed.toFixed(1)} სთ).\n\nტექსტი: "${text}"`
            ).catch(() => {});
          }
        } catch (err) {
          console.error(`[GhostRecovery] Failed for ${userId}:`, err.message);
        }
      }
    }
  }

  if (hasChanges) {
    saveSessions(updatedSessions);
  }

  return recoveredCount;
}
