import { getOrders, updateOrder, getCustomerProfile, updateSession, isBotPausedForUser } from './storage.js';
import { sendQuickReplies, sendSenderAction } from './facebook.js';
import { notifyTelegramAlert } from './telegram.js';

/**
 * Checks all orders and sends gentle Post-Purchase Care Check-in messages
 * STRICTLY to orders that have been verified and marked as 'DELIVERED'.
 * 
 * Rules:
 * 1. Must be status === 'DELIVERED'.
 * 2. Must have deliveredAt timestamp.
 * 3. Time elapsed must be between 24 and 96 hours (1 to 4 days post-delivery).
 * 4. Must NOT have been sent before (!order.followUpSent).
 * 5. Must NOT have bot paused due to human admin activity (!isBotPausedForUser).
 */
export async function checkAndSendPostDeliveryFollowUps() {
  const orders = getOrders();
  const now = Date.now();
  let sentCount = 0;

  for (const order of orders) {
    // 1. Strict Delivery Guard
    if (order.status !== 'DELIVERED' || !order.deliveredAt) continue;

    // 2. Deduplication Guard
    if (order.followUpSent) continue;

    // 3. Time Window: between 24 and 96 hours post-delivery
    const deliveredMs = new Date(order.deliveredAt).getTime();
    if (isNaN(deliveredMs)) continue;
    const hoursElapsed = (now - deliveredMs) / (1000 * 60 * 60);
    if (hoursElapsed < 24 || hoursElapsed > 96) continue;

    // 4. Human Admin Guard
    if (isBotPausedForUser(order.userId)) continue;

    // Send the check-in!
    const success = await sendSingleOrderFollowUp(order);
    if (success) {
      sentCount++;
    }
  }

  return sentCount;
}

/**
 * Sends a single post-delivery care check-in for a specific delivered order.
 * Can be called automatically by cron OR manually via 1-click button in Dashboard.
 */
export async function sendSingleOrderFollowUp(order) {
  if (!order || !order.userId) return false;

  const profile = getCustomerProfile(order.userId) || {};
  const customerName = (order.customerName || profile.name || '').split(' ')[0].trim();
  const petName = profile.petName || '';

  const petSubject = petName ? `${petName}-მ` : 'თქვენმა ოთხფეხა მეგობარმა';
  
  const text = `მოგესალმებით${customerName ? ` ${customerName}` : ''}! 🐾 მოგიკითხეთ „ხრამუნას“ საწარმოდან.

როგორ მოეწონა ${petSubject} ჩვენი სასუსნავი? ხომ არ გაუჭირდა დაღეჭვა ან რაიმე კითხვა ხომ არ გაქვთ? ❤️`;

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
        '💌 *Care Check-in გაეგზავნა კლიენტს*',
        `👤 კლიენტი: ${order.customerName || order.userId}\n🐶 ცუგა: ${petName || 'ოთხფეხა'}\n📦 შეკვეთა: ${order.product} (${order.id})\n\nბოტმა გაუგზავნა მზრუნველი მოკითხვა ჩაბარების შემდეგ.`
      );
      return true;
    }
  } catch (err) {
    console.error(`[FollowUp] Error sending to ${order.userId}:`, err.message);
  }
  return false;
}
