import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { generateBotResponse } from './services/ai.js';
import {
  replyToComment,
  sendGenericTemplate,
  sendMessengerMessage,
  sendPrivateReply,
  sendProductCatalog,
  sendQuickReplies,
  sendSenderAction,
} from './services/facebook.js';
import { saveOrderToGoogleSheet } from './services/sheets.js';
import { notifyTelegramOrder } from './services/telegram.js';
import { handleCommentAction, startCommentMonitor } from './services/commentMonitor.js';
import { getOrders, getSession, saveOrder, updateSession } from './services/storage.js';

const PRODUCT_MAP = {
  paws: { name: 'დრაკონის თათები (100გ)', price: 18, desc: '100% ქათმის ფეხი • ბუნებრივი კოლაგენი და კბილების წმენდა' },
  lung: { name: 'ღრუბელი (50გ)', price: 15, desc: '100% საქონლის ფილტვი • ჰაეროვანი, დაბალკალორიული, წვრთნისთვის' },
  liver: { name: 'სუპერ-კუბები (80გ)', price: 17, desc: '100% საქონლის ღვიძლი • ვიტამინების ბომბი და არომატი' },
  powder: { name: 'ჯადოსნური პუდრა (40გ)', price: 12, desc: '100% ხორცის ფხვნილი • მადის აღმძვრელი ტოპინგი' },
  full_pack: { name: 'Full Pack (სრული ნაკრები)', price: 49.50, desc: 'ოთხივე პროდუქტი ერთად 10% ფასდაკლებით' },
};

const app = express();
const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'khramuna_secret_verify_token';

app.use(express.json());

// Healthcheck
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    brand: 'ხრამუნა',
    timestamp: new Date().toISOString(),
  });
});

// Orders API for owner
app.get('/api/orders', (req, res) => {
  const orders = getOrders();
  res.json({ count: orders.length, orders });
});

// Download CSV for Excel & Google Sheets
app.get('/api/orders/download', (req, res) => {
  const desktopCsv = path.join('C:\\Users\\Lenovo Yoga\\Desktop', 'ხრამუნას_შეკვეთები.csv');
  if (fs.existsSync(desktopCsv)) {
    res.download(desktopCsv, 'khramuna_orders.csv');
  } else {
    res.status(404).send('CSV file not generated yet.');
  }
});

// Visual Orders Dashboard
app.get('/orders', (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ხრამუნა • შეკვეთების მართვა</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Georgian:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --border: #334155;
      --primary: #f59e0b;
      --primary-hover: #d97706;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --success: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Noto Sans Georgian', sans-serif; }
    body { background: var(--bg); color: var(--text); padding: 32px 20px; min-height: 100vh; }
    .container { max-width: 1200px; margin: 0 auto; }
    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; flex-wrap: wrap; gap: 16px; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-logo { font-size: 32px; background: #334155; padding: 6px 12px; border-radius: 12px; border: 1px solid var(--border); }
    .brand h1 { font-size: 24px; font-weight: 700; color: #fff; }
    .brand p { font-size: 13px; color: var(--text-muted); }
    .actions { display: flex; gap: 12px; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 8px; font-weight: 600; font-size: 14px; text-decoration: none; cursor: pointer; border: none; transition: 0.2s; }
    .btn-primary { background: var(--primary); color: #000; }
    .btn-primary:hover { background: var(--primary-hover); }
    .btn-secondary { background: var(--card-bg); color: var(--text); border: 1px solid var(--border); }
    .btn-secondary:hover { background: #334155; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 28px; }
    .stat-card { background: var(--card-bg); border: 1px solid var(--border); padding: 20px; border-radius: 12px; }
    .stat-label { font-size: 13px; color: var(--text-muted); margin-bottom: 6px; }
    .stat-value { font-size: 28px; font-weight: 700; color: #fff; }
    .table-container { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; }
    th { background: #0b1329; padding: 14px 18px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px; border-bottom: 1px solid var(--border); }
    td { padding: 16px 18px; border-bottom: 1px solid var(--border); vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    tr:hover { background: rgba(255,255,255,0.02); }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-pending { background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); }
    .badge-confirmed { background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); }
    .order-id { font-weight: 700; color: var(--primary); font-family: monospace; font-size: 14px; }
    .empty-state { text-align: center; padding: 48px 20px; color: var(--text-muted); }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <div class="brand-logo">🐾</div>
        <div>
          <h1>ხრამუნა • შეკვეთების ცენტრი</h1>
          <p>Facebook Messenger-ის ავტომატური გაყიდვების ბაზა</p>
        </div>
      </div>
      <div class="actions">
        <button class="btn btn-secondary" onclick="loadOrders()">🔄 განახლება</button>
        <a href="/api/orders/download" class="btn btn-primary">📥 Excel / CSV ჩამოტვირთვა</a>
      </div>
    </header>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-label">სულ შეკვეთა</div>
        <div class="stat-value" id="totalOrders">0</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">მიმდინარე შეკვეთები</div>
        <div class="stat-value" id="pendingOrders" style="color: var(--primary);">0</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">ჯამური შემოსავალი</div>
        <div class="stat-value" id="totalRevenue" style="color: var(--success);">0 ₾</div>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>თარიღი</th>
            <th>პროდუქტი</th>
            <th>თანხა</th>
            <th>მისამართი</th>
            <th>ტელეფონი</th>
            <th>სტატუსი</th>
          </tr>
        </thead>
        <tbody id="ordersTableBody">
          <tr><td colspan="7" class="empty-state">იტვირთება მონაცემები...</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <script>
    async function loadOrders() {
      try {
        const res = await fetch('/api/orders');
        const data = await res.json();
        const orders = data.orders || [];

        document.getElementById('totalOrders').textContent = orders.length;
        const pending = orders.filter(o => !o.status || o.status === 'PENDING').length;
        document.getElementById('pendingOrders').textContent = pending;

        const totalRev = orders.reduce((sum, o) => sum + (parseFloat(o.price) || 0), 0);
        document.getElementById('totalRevenue').textContent = totalRev.toFixed(2) + ' ₾';

        const tbody = document.getElementById('ordersTableBody');
        if (orders.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" class="empty-state">ჯერჯერობით შეკვეთები არ არის</td></tr>';
          return;
        }

        tbody.innerHTML = orders.slice().reverse().map(o => {
          const date = new Date(o.createdAt).toLocaleString('ka-GE', { timeZone: 'Asia/Tbilisi' });
          const statusClass = (o.status === 'CONFIRMED' || o.status === 'DELIVERED') ? 'badge-confirmed' : 'badge-pending';
          const statusText = o.status || 'PENDING';
          return '<tr>' +
            '<td class="order-id">' + (o.id || '-') + '</td>' +
            '<td>' + date + '</td>' +
            '<td><strong>' + (o.product || '-') + '</strong></td>' +
            '<td><strong style="color: #f59e0b;">' + (o.price ? o.price + ' ₾' : '-') + '</strong></td>' +
            '<td>' + (o.address || '<span style="color:#64748b;">არ არის მითითებული</span>') + '</td>' +
            '<td>' + (o.phone || '<span style="color:#64748b;">არ არის მითითებული</span>') + '</td>' +
            '<td><span class="badge ' + statusClass + '">' + statusText + '</span></td>' +
          '</tr>';
        }).join('');
      } catch (err) {
        console.error('Failed to load orders', err);
      }
    }

    loadOrders();
    // Auto refresh every 10 seconds
    setInterval(loadOrders, 10000);
  </script>
</body>
</html>`;
  res.send(html);
});

/**
 * Direct Test Chat Endpoint (allows testing the AI and order pipeline before linking Meta)
 */
app.post('/api/test-chat', async (req, res) => {
  const { userId = 'test_user_1', message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'message field is required' });
  }

  const session = getSession(userId);
  updateSession(userId, 'user', message);

  const aiRes = await generateBotResponse(message, session.history);
  updateSession(userId, 'assistant', aiRes.replyText);

  let createdOrder = null;
  if (aiRes.isOrderReady && aiRes.order) {
    const cleanPhone = (aiRes.order.phone || '').replace(/[^\d]/g, '');
    const cleanAddress = (aiRes.order.address || '').trim();

    if (cleanPhone.length >= 9 && cleanAddress.length >= 5) {
      createdOrder = saveOrder({
        userId,
        ...aiRes.order,
      });
      // Sync with Google Sheets & Telegram
      await saveOrderToGoogleSheet(createdOrder);
      await notifyTelegramOrder(createdOrder);
    } else {
      console.warn('[TestChat] Order blocked by validation:', aiRes.order);
    }
  }

  res.json({
    reply: aiRes.replyText,
    isOrderReady: aiRes.isOrderReady,
    order: createdOrder,
  });
});

/**
 * Meta Webhook Verification Endpoint
 */
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[Webhook] Verification succeeded with Meta.');
      res.status(200).send(challenge);
    } else {
      console.warn('[Webhook] Verification token mismatch.');
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

/**
 * Meta Webhook Event Handler (Facebook Messenger incoming messages)
 */
app.post('/webhook', async (req, res) => {
  const body = req.body;
  console.log('[Webhook Incoming POST]:', JSON.stringify(body));

  if (body.object === 'page') {
    try {
      for (const entry of body.entry || []) {
        for (const webhookEvent of entry.messaging || []) {
          const senderPsid = webhookEvent.sender?.id;
          if (!senderPsid) continue;

          await sendSenderAction(senderPsid, 'typing_on');

          const postbackPayload = webhookEvent.postback?.payload;
          const quickReplyPayload = webhookEvent.message?.quick_reply?.payload;
          const payload = postbackPayload || quickReplyPayload;

          // 1. Handle interactive button clicks (Postback or Quick Reply)
          if (payload) {
            console.log(`[Messenger Funnel] User ${senderPsid} clicked payload: ${payload}`);

            if (payload === 'SHOW_CATALOG') {
              await sendMessengerMessage(senderPsid, 'გთავაზობთ ჩვენს 100% ნატურალურ ასორტიმენტს: 🐾');
              await sendProductCatalog(senderPsid);
              continue;
            }

            if (payload.startsWith('ORDER_')) {
              const productKey = payload.replace('ORDER_', '');
              const product = PRODUCT_MAP[productKey];

              if (product) {
                const session = getSession(senderPsid);
                updateSession(senderPsid, 'user', `ავირჩიე შეკვეთა: ${product.name}`);

                const confirmText = `შესანიშნავი არჩევანია! 🐾\nთქვენი არჩევანი: ${product.name} — ${product.price}₾.\n\nგთხოვთ მომწეროთ მიტანის მისამართი და ტელეფონის ნომერი, კურიერს გავატანთ და ხვალვე თქვენთან იქნება 📍📞`;
                await sendMessengerMessage(senderPsid, confirmText);
                updateSession(senderPsid, 'assistant', confirmText);
                continue;
              }
            }

            if (payload.startsWith('INFO_')) {
              const productKey = payload.replace('INFO_', '');
              const product = PRODUCT_MAP[productKey];

              if (product) {
                const infoText = `🐾 ${product.name}\n\n${product.desc}\nფასი: ${product.price}₾\n\nგსურთ შეკვეთის გაფორმება? 🐶`;
                await sendMessengerMessage(senderPsid, infoText);
                continue;
              }
            }
          }

          // 2. Handle Text Messages
          const message = webhookEvent.message;
          if (message && !message.is_echo && message.text) {
            const userText = message.text.trim();
            console.log(`[Messenger] Processing message from ${senderPsid}: "${userText}"`);

            const session = getSession(senderPsid);
            updateSession(senderPsid, 'user', userText);

            // Fast-path: Common courtesies (instant, warm, human, zero API overhead)
            const cleanText = userText.toLowerCase().replace(/[.,!?;:()]/g, '').trim();
            const thanksList = ['მადლობა', 'დიდი მადლობა', 'მადლობთ', 'გაიხარე', 'გაიხარეთ', 'მადლობა დიდი'];
            if (thanksList.includes(cleanText)) {
              const thankReply = 'არაფრის, გაახარეთ თქვენი ცუგა! ❤️ თუ რამე დაგჭირდეთ, ნებისმიერ დროს მომწერეთ.';
              await sendMessengerMessage(senderPsid, thankReply);
              updateSession(senderPsid, 'assistant', thankReply);
              continue;
            }

            // Only show interactive catalog carousel if specifically asked
            if (cleanText === 'კატალოგი' || cleanText === 'მენიუ') {
              await sendMessengerMessage(senderPsid, 'გთავაზობთ ჩვენს 100% ნატურალურ ასორტიმენტს: 🐾');
              await sendProductCatalog(senderPsid);
              updateSession(senderPsid, 'assistant', 'გაიგზავნა პროდუქციის კატალოგი');
              continue;
            }

            console.log('[Messenger] Calling Gemini AI...');
            const aiResponse = await generateBotResponse(userText, session.history);
            console.log('[Messenger] Gemini reply:', aiResponse.replyText);

            if (aiResponse.isOrderReady && aiResponse.order) {
              const cleanPhone = (aiResponse.order.phone || '').replace(/[^\d]/g, '');
              const cleanAddress = (aiResponse.order.address || '').trim();

              if (cleanPhone.length >= 9 && cleanAddress.length >= 5) {
                const order = saveOrder({
                  userId: senderPsid,
                  ...aiResponse.order,
                });
                await saveOrderToGoogleSheet(order);
                await notifyTelegramOrder(order);
              } else {
                console.warn('[Messenger] Order blocked by validation guard:', aiResponse.order);
              }
            }

            // Simulate natural human typing pause
            await new Promise((resolve) => setTimeout(resolve, 1200));

            console.log('[Messenger] Sending natural reply back to Facebook...');
            // Send pure, natural human message without robotic quick-reply buttons
            await sendMessengerMessage(senderPsid, aiResponse.replyText);
            updateSession(senderPsid, 'assistant', aiResponse.replyText);
          }
        }

        // 2. Handle Comments on Posts (Feed Webhook)
        for (const change of entry.changes || []) {
          if (change.field === 'feed' && change.value) {
            const val = change.value;
            // Only process new comments from users (not by the page itself)
            if (val.item === 'comment' && val.verb === 'add' && val.from && val.from.id !== '928195650386088') {
              const commentId = val.comment_id;
              const commenterName = val.from.name || '';
              console.log(`[Feed Webhook] Comment from ${commenterName} (${commentId}): "${val.message || ''}"`);

              await handleCommentAction({
                commentId,
                commenterName,
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('[Webhook Processing Error]:', err);
    }
    return res.status(200).send('EVENT_RECEIVED');
  } else {
    return res.sendStatus(404);
  }
});

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🐾 ხრამუნას ავტომატიზაციის სერვერი ჩაირთო პორტზე: ${PORT}`);
    console.log(`👉 Webhook URL: http://localhost:${PORT}/webhook`);
    console.log(`👉 Test Chat API: POST http://localhost:${PORT}/api/test-chat`);
    console.log(`👉 Orders Dashboard: http://localhost:${PORT}/api/orders`);
    console.log(`===============================================`);

    // Start background monitoring of Facebook comments
    startCommentMonitor(15000); // Check every 15 seconds
  });
}

export default app;
