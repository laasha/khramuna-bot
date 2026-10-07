/**
 * Telegram notification service for "ხრამუნა" order dispatches with Courier Directives.
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
  const petDetails = order.petInfo ? `🐶 *ცუგა:* ${order.petInfo}\n` : '';
  const notesDetails = order.deliveryNotes ? `📝 *შენიშვნა/დრო:* ${order.deliveryNotes}\n` : '';
  const cityDetails = order.city ? `🏙️ *ქალაქი:* ${order.city}\n` : '';

  const isCash = (order.paymentMethod || '').toLowerCase().includes('ნაღდ') || (order.paymentMethod || '').toLowerCase() === 'cash';
  const paymentBanner = isCash
    ? `💵 *გადახდის მეთოდი:* ნაღდი კურიერთან\n🔴 *კურიერის ინსტრუქცია:* **გამოსართმევია: ${total} ₾ (ჩაიბარეთ ნაღდი)**`
    : `💳 *გადახდის მეთოდი:* საბანკო გადარიცხვა\n🟢 *კურიერის ინსტრუქცია:* **თანხა უკვე გადახდილია, კლიენტს ფული არ გამოართვათ!**`;

  const text = `
🐾 *ახალი შეკვეთა #${order.id} — ხრამუნა*
━━━━━━━━━━━━━━━━━━━
${petDetails}${cityDetails}📦 *პროდუქტი:*
${productDetails || '  • დაუზუსტებელი'}

💰 *ჯამური თანხა:* *${total} ₾*
${paymentBanner}

📍 *მისამართი:* ${order.address || 'დაუზუსტებელი'}
${notesDetails}📞 *ტელეფონი:* \`${order.phone || 'არ არის'}\` ${cleanPhone ? `([დარეკვა](tel:${cleanPhone}))` : ''}
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
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ დადასტურდა', callback_data: `confirm_${order.id}` },
              { text: '🚚 გატანილია კურიერთან', callback_data: `shipped_${order.id}` }
            ],
            cleanPhone ? [{ text: `📞 დარეკვა (${cleanPhone})`, url: `tel:${cleanPhone}` }] : []
          ].filter(row => row.length > 0)
        }
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

/**
 * Forwards payment receipt screenshot to Telegram channel for admin verification.
 */
export async function notifyTelegramReceipt(photoUrl, senderId) {
  const token = process.env.TELEGRAM_BOT_TOKEN || '8602396382:AAFiNvqT4SInU4VcIDSJmV31FdK-spMKm7M';
  const chatId = process.env.TELEGRAM_CHAT_ID || '1317626946';

  if (!token || !chatId || !photoUrl) return false;

  const caption = `📸 *მიღებულია გადარიცხვის ქვითარი!*\n👤 კლიენტი (ID): \`${senderId}\`\n⏰ ${new Date().toLocaleString('ka-GE', { timeZone: 'Asia/Tbilisi' })}\nგთხოვთ გადაამოწმოთ საბანკო ამონაწერი.`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photoUrl,
        caption,
        parse_mode: 'Markdown'
      })
    });
    const data = await res.json();
    return data.ok;
  } catch (e) {
    console.error('[Telegram] Receipt photo forward error:', e.message);
    return false;
  }
}
