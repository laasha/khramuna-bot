/**
 * Telegram notification service for "ხრამუნა" order dispatches.
 */
export async function notifyTelegramOrder(order) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('[Telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not configured. Skipping alert.');
    return false;
  }

  const itemsList = (order.items || [])
    .map(item => `  • *${item.name}* x${item.quantity || 1} — ${item.price || ''}₾`)
    .join('\n');

  const text = `
🐾 *ახალი შეკვეთა #${order.id} — ხრამუნა*
━━━━━━━━━━━━━━━━━━━
👤 *მომხმარებელი:* ${order.customerName || 'უცნობი'}
📞 *ტელეფონი:* \`${order.phone || 'მითითებული არ არის'}\`
📍 *მისამართი:* ${order.address || 'დაუზუსტებელი'}
📦 *მიწოდების ტიპი:* ${order.deliveryType === 'WAITLIST' ? 'Waitlist (ახალი პარტია, -10%)' : 'სტანდარტული (24-48 სთ)'}

🛒 *შეკვეთილი პროდუქტები:*
${itemsList || '  • დაუზუსტებელი კალათა'}

💰 *სულ გადასახდელი:* *${order.totalPrice || 0} ₾*
💳 *გადახდის მეთოდი:* ${order.paymentMethod || 'საბანკო გადარიცხვა'}
━━━━━━━━━━━━━━━━━━━
⏰ *დრო:* ${new Date().toLocaleString('ka-GE', { timeZone: 'Asia/Tbilisi' })}
`;

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    });

    const data = await res.json();
    if (!data.ok) {
      console.error('[Telegram] Error response:', data);
      return false;
    }
    console.log(`[Telegram] Order alert #${order.id} sent successfully.`);
    return true;
  } catch (error) {
    console.error('[Telegram] Failed to send message:', error.message);
    return false;
  }
}
