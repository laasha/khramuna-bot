/**
 * Google Sheets Integration Service.
 * Appends new orders to Google Sheet in real time with Retry Queue and Emergency Telegram Backup.
 */

export async function saveOrderToGoogleSheet(order) {
  const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbwJOqYmyrAiQrRR2t6mIC9s93xWSh7NyWrw2RBoGYr_mrtlhn0cv5-Buclf3uucRU_SHw/exec';

  if (!webhookUrl) {
    console.log('[Google Sheets] GOOGLE_SHEET_WEBHOOK_URL not configured yet. Order saved locally in data/orders.json.');
    return false;
  }

  const payload = {
    id: order.id,
    createdAt: order.createdAt || new Date().toISOString(),
    product: order.product || 'Full Pack',
    price: order.price || 0,
    address: order.address || 'არ არის მითითებული',
    phone: order.phone || 'არ არის მითითებული',
    paymentMethod: order.paymentMethod || 'გადარიცხვა',
    deliveryNotes: order.deliveryNotes || '',
    petInfo: order.petInfo || '',
    status: order.status || 'PENDING',
  };

  let attempts = 0;
  const maxAttempts = 3;
  while (attempts < maxAttempts) {
    attempts++;
    try {
      console.log(`[Google Sheets] Sending order ${order.id} to Google Sheets (attempt ${attempts}/${maxAttempts})...`);
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        console.log(`[Google Sheets] Order ${order.id} successfully recorded in Google Sheet!`);
        return true;
      } else {
        console.warn(`[Google Sheets] Failed attempt ${attempts} to save order ${order.id}. HTTP status: ${res.status}`);
      }
    } catch (err) {
      console.error(`[Google Sheets] Attempt ${attempts} network error syncing order ${order.id}:`, err.message);
    }
    if (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 1200 * attempts));
    }
  }

  // Emergency Backup: If all attempts failed, send instant Telegram alert to founder so ZERO orders are lost!
  console.error(`[Google Sheets] All ${maxAttempts} attempts failed for order ${order.id}. Triggering emergency Telegram backup!`);
  try {
    const { notifyTelegramAlert } = await import('./telegram.js');
    await notifyTelegramAlert(
      '🚨 *კრიტიკული: Google Sheets-ში შეკვეთის ჩაწერა ჩავარდა!*',
      `📋 *შეკვეთის ID:* \`${order.id}\`\n📦 *პროდუქტი:* ${order.product}\n💰 *თანხა:* ${order.price}₾\n📍 *მისამართი:* ${order.address}\n📞 *ტელეფონი:* ${order.phone}\n💳 *გადახდა:* ${order.paymentMethod}\n📝 *შენიშვნა:* ${order.deliveryNotes || 'არ არის'}\n\n⚠️ გთხოვთ ხელით გადაამოწმოთ და შეიტანოთ ცხრილში!`
    );
  } catch (tgErr) {
    console.error('[Google Sheets] Could not send emergency TG alert:', tgErr.message);
  }

  return false;
}
