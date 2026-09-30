/**
 * Telegram notification service for "ხრამუნა" order dispatches.
 */
export async function notifyTelegramOrder(order) {
  const token = process.env.TELEGRAM_BOT_TOKEN || '8602396382:AAFiNvqT4SInU4VcIDSJmV31FdK-spMKm7M';
  const chatId = process.env.TELEGRAM_CHAT_ID || '1317626946';

  if (!token || !chatId) {
    console.warn('[Telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not configured. Skipping alert.');
    return false;
  }

  const productDetails = order.product
    ? `  • *${order.product}* — ${order.price ? order.price + ' ₾' : ''}`
    : (order.items || [])
        .map(item => `  • *${item.name}* x${item.quantity || 1} — ${item.price || ''}₾`)
        .join('\n');

  const total = order.price || order.totalPrice || '0';
  const cleanPhone = (order.phone || '').replace(/[^\d+]/g, '');

  const text = `
🐾 *ახალი შეკვეთა #${order.id} — ხრამუნა*
━━━━━━━━━━━━━━━━━━━
📦 *პროდუქტი:*
${productDetails || '  • დაუზუსტებელი'}

💰 *თანხა:* *${total} ₾*
📍 *მისამართი:* ${order.address || 'დაუზუსტებელი'}
📞 *ტელეფონი:* \`${order.phone || 'არ არის'}\` ${cleanPhone ? `([დარეკვა](tel:${cleanPhone}))` : ''}
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
