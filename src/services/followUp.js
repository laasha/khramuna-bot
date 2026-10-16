import { getOrders, updateOrder, getCustomerProfile, updateSession, isBotPausedForUser } from './storage.js';
import { sendQuickReplies, sendSenderAction } from './facebook.js';
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
  
  const text = `მოგესალმებით${customerName ? ` ${customerName}` : ''}! 🐾 მოგიკითხეთ „ხრამუნას“ საწარმოდან.\n\nროგორ მოეწონა ${petSubject} ჩვენი სასუსნავი? ხომ არ გაუჭირდა დაღეჭვა ან რაიმე კითხვა ხომ არ გაქვთ? ❤️`;

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
