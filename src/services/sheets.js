/**
 * Google Sheets Integration Service.
 * Appends new orders to Google Sheet in real time.
 */

export async function saveOrderToGoogleSheet(order) {
  const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbwJOqYmyrAiQrRR2t6mIC9s93xWSh7NyWrw2RBoGYr_mrtlhn0cv5-Buclf3uucRU_SHw/exec';

  if (!webhookUrl) {
    console.log('[Google Sheets] GOOGLE_SHEET_WEBHOOK_URL not configured yet. Order saved locally in data/orders.json.');
    return false;
  }

  try {
    const payload = {
      id: order.id,
      createdAt: order.createdAt || new Date().toISOString(),
      product: order.product || 'Full Pack',
      price: order.price || 0,
      address: order.address || 'არ არის მითითებული',
      phone: order.phone || 'არ არის მითითებული',
      status: order.status || 'PENDING',
    };

    console.log(`[Google Sheets] Sending order ${order.id} to Google Sheets...`);
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      console.log(`[Google Sheets] Order ${order.id} successfully recorded in Google Sheet!`);
      return true;
    } else {
      console.warn(`[Google Sheets] Failed to save order ${order.id}. HTTP status: ${res.status}`);
      return false;
    }
  } catch (err) {
    console.error(`[Google Sheets] Network error syncing order ${order.id}:`, err.message);
    return false;
  }
}
