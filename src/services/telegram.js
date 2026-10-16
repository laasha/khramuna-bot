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

  const isPaid = order.status === 'CONFIRMED_PAID';
  const isCash = (order.paymentMethod || '').toLowerCase().includes('ნაღდ') || (order.paymentMethod || '').toLowerCase() === 'cash';

  let paymentBanner = '';
  if (isPaid) {
    paymentBanner = `💳 *გადახდის მეთოდი:* საბანკო გადარიცხვა (დამოწმებულია ✅)\n🟢 *კურიერის ინსტრუქცია:* **თანხა უკვე გადახდილია, კლიენტს ფული არ გამოართვათ!**`;
  } else if (isCash) {
    paymentBanner = `💵 *გადახდის მეთოდი:* ნაღდი კურიერთან\n🔴 *კურიერის ინსტრუქცია:* **გამოსართმევია: ${total} ₾ (ჩაიბარეთ ნაღდი ჩაბარებისას)**`;
  } else {
    paymentBanner = `💳 *გადახდის მეთოდი:* საბანკო გადარიცხვა (ელოდება ჩარიცხვას ⏳)\n🟡 *კურიერის ინსტრუქცია:* **ყურადღება! თანხა ჯერ არ ჩარიცხულა. არ გაატანოთ კურიერს, სანამ ქვითარი არ დადასტურდება!**`;
  }

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
            ]
          ]
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
export async function notifyTelegramReceipt(photoUrl, senderId, ocrResult = null, order = null) {
  const token = process.env.TELEGRAM_BOT_TOKEN || '8602396382:AAFiNvqT4SInU4VcIDSJmV31FdK-spMKm7M';
  const chatId = process.env.TELEGRAM_CHAT_ID || '1317626946';

  if (!token || !chatId || !photoUrl) return false;

  let caption = '';
  if (ocrResult && ocrResult.isReceipt) {
    const bankStr = ocrResult.bank || 'უცნობი ბანკი';
    const amountStr = ocrResult.amount ? `${ocrResult.amount}₾` : 'მითითებული არაა';
    const matchBadge = ocrResult.matchesExpected ? '✅ ემთხვევა' : (order?.price ? `⚠️ მოსალოდნელია ${order.price}₾` : '');
    const accountBadge = ocrResult.matchesAccount ? '✅ მიმღები: ლ.ხ.' : '⚠️ გადაამოწმეთ მიმღები';

    caption = `📸 *გადარიცხვის ქვითარი დამოწმებულია (AI OCR)!*\n` +
      `🏦 *ბანკი:* ${bankStr}\n` +
      `💰 *თანხა:* ${amountStr} ${matchBadge}\n` +
      `🎯 *რეკვიზიტი:* ${accountBadge}\n` +
      (ocrResult.transactionId ? `🆔 *ტრანზაქცია:* \`${ocrResult.transactionId}\`\n` : '') +
      (order ? `📋 *შეკვეთა:* \`${order.id}\` (${order.product})\n📍 *მისამართი:* ${order.address}\n📞 *ტელეფონი:* ${order.phone}\n` : '') +
      `👤 *კლიენტი (ID):* \`${senderId}\`\n` +
      `⏰ ${new Date().toLocaleString('ka-GE', { timeZone: 'Asia/Tbilisi' })}`;
  } else {
    caption = `📸 *მიღებულია გადარიცხვის ქვითარი!*\n👤 კლიენტი (ID): \`${senderId}\`\n⏰ ${new Date().toLocaleString('ka-GE', { timeZone: 'Asia/Tbilisi' })}\nგთხოვთ გადაამოწმოთ საბანკო ამონაწერი.`;
  }

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

/**
 * Sends real-time priority alerts to Telegram (Escalations, Rescheduling, Complaints).
 */
export async function notifyTelegramAlert(title, details) {
  const token = process.env.TELEGRAM_BOT_TOKEN || '8602396382:AAFiNvqT4SInU4VcIDSJmV31FdK-spMKm7M';
  const chatId = process.env.TELEGRAM_CHAT_ID || '1317626946';

  if (!token || !chatId) return false;

  const text = `${title}\n\n${details}\n⏰ ${new Date().toLocaleString('ka-GE', { timeZone: 'Asia/Tbilisi' })}`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown'
      })
    });
    const data = await res.json();
    return data.ok;
  } catch (err) {
    console.error('[Telegram Alert Error]:', err.message);
    return false;
  }
}
/**
 * Generates Daily Financial & Operations Summary for the Founder.
 */
export function generateDailyReport(orders = []) {
  const now = new Date();
  const todayStr = now.toLocaleDateString('ka-GE', { timeZone: 'Asia/Tbilisi' });

  // Filter orders created today (Tbilisi timezone)
  const todayOrders = orders.filter(o => {
    if (!o.createdAt) return false;
    const orderDateStr = new Date(o.createdAt).toLocaleDateString('ka-GE', { timeZone: 'Asia/Tbilisi' });
    return orderDateStr === todayStr;
  });

  const totalOrders = todayOrders.length;
  let totalRevenue = 0;
  let paidCount = 0;
  let paidRevenue = 0;
  let cashCount = 0;
  let cashRevenue = 0;
  let pendingCount = 0;

  for (const o of todayOrders) {
    const price = parseFloat(o.price) || 0;
    totalRevenue += price;
    if (o.status === 'CONFIRMED_PAID') {
      paidCount++;
      paidRevenue += price;
    } else if (o.status === 'PAY_ON_DELIVERY' || (o.paymentMethod || '').toLowerCase().includes('ნაღდ')) {
      cashCount++;
      cashRevenue += price;
    } else {
      pendingCount++;
    }
  }

  return `📊 *„ხრამუნას“ დღის ანგარიში (${todayStr})*
━━━━━━━━━━━━━━━━━━━
📦 *სულ შეკვეთა:* ${totalOrders}
💰 *ჯამური შემოსავალი:* *${totalRevenue.toFixed(2)} ₾*

💳 *საბანკო (ჩარიცხული):* ${paidCount} შეკვეთა (${paidRevenue.toFixed(2)} ₾) ✅
💵 *ნაღდი (კურიერთან):* ${cashCount} შეკვეთა (${cashRevenue.toFixed(2)} ₾) 🛵
⏳ *მოლოდინში (Pending):* ${pendingCount} შეკვეთა

━━━━━━━━━━━━━━━━━━━
⏰ *დრო:* ${now.toLocaleTimeString('ka-GE', { timeZone: 'Asia/Tbilisi' })}`;
}

/**
 * Generates a clean, copy-pasteable Courier Dispatch Route Sheet.
 */
export function generateCourierDispatchList(orders = []) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('ka-GE', { timeZone: 'Asia/Tbilisi' });

  // Active orders ready for dispatch
  const activeOrders = orders.filter(o => {
    const isReadyStatus = ['CONFIRMED_PAID', 'PAY_ON_DELIVERY', 'READY_FOR_DELIVERY', 'PENDING_DELIVERY'].includes(o.status);
    const hasDeliveryInfo = o.address && o.address !== 'არ არის მითითებული';
    return (isReadyStatus || (o.status === 'PENDING' && o.phone)) && hasDeliveryInfo;
  });

  if (activeOrders.length === 0) {
    return `📍 *საკურიერო მარშრუტი (${dateStr})*\n\nამ ეტაპზე გასაგზავნი შეკვეთები არ არის.`;
  }

  let text = `📍 *საკურიერო მარშრუტი (${dateStr})*\n━━━━━━━━━━━━━━━━━━━\n`;
  let totalCashToCollect = 0;

  activeOrders.forEach((o, idx) => {
    const price = parseFloat(o.price) || 0;
    const isPaid = o.status === 'CONFIRMED_PAID';
    const isCash = !isPaid && ((o.paymentMethod || '').toLowerCase().includes('ნაღდ') || o.status === 'PAY_ON_DELIVERY');

    let paymentBadge = '';
    if (isPaid) {
      paymentBadge = 'გადახდილია ✅';
    } else if (isCash) {
      paymentBadge = `ასაღებია: ${price.toFixed(2)}₾ 💵`;
      totalCashToCollect += price;
    } else {
      paymentBadge = `ჩარიცხვა მოლოდინში (${price.toFixed(2)}₾) ⏳`;
    }

    const cleanPhone = (o.phone || '').replace(/[^\d+]/g, '');
    const clientName = o.customerName || 'კლიენტი';
    const notesStr = o.deliveryNotes ? ` (შენიშვნა: ${o.deliveryNotes})` : '';

    text += `*${idx + 1}.* ${clientName} | 📞 \`${o.phone || 'ნომერი არაა'}\`\n` +
      `📍 ${o.address}${notesStr}\n` +
      `📦 ${o.product || 'პროდუქტი'} — *${paymentBadge}*\n\n`;
  });

  text += `━━━━━━━━━━━━━━━━━━━\n` +
    `📦 *სულ ამანათი:* ${activeOrders.length}\n` +
    `💵 *სულ ასაღები ნაღდი თანხა:* *${totalCashToCollect.toFixed(2)} ₾*`;

  return text;
}
