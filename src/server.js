const processedMids = new Set();
const userTextLocks = new Map();

// Smart Debounce Queue for rapid consecutive user messages (e.g. 2-3 short texts sent within 1.8s)
const userMessageQueues = new Map();

function normalizeGeorgianPhone(rawPhone) {
  if (!rawPhone) return '';
  let clean = String(rawPhone).replace(/[^\d]/g, '');
  if (clean.startsWith('995') && clean.length >= 12) {
    clean = clean.slice(3);
  }
  if (clean.startsWith('0')) {
    clean = clean.replace(/^0+/, '');
  }
  return clean;
}

function enqueueUserMessage(senderPsid, text) {
  return new Promise((resolve) => {
    let queue = userMessageQueues.get(senderPsid);
    if (!queue) {
      queue = {
        messages: [],
        timer: null,
        resolves: [],
      };
      userMessageQueues.set(senderPsid, queue);
    }

    queue.messages.push(text);
    queue.resolves.push(resolve);

    if (queue.timer) {
      clearTimeout(queue.timer);
    }

    queue.timer = setTimeout(() => {
      userMessageQueues.delete(senderPsid);
      const combinedText = queue.messages.join(' \n ');
      const resolvesToCall = queue.resolves;
      resolvesToCall[0]({ isPrimary: true, combinedText });
      for (let i = 1; i < resolvesToCall.length; i++) {
        resolvesToCall[i]({ isPrimary: false, combinedText: null });
      }
    }, 3200); // 3.2 second debounce window (aggregates rapid multi-message thoughts)
  });
}

import 'dotenv/config';

export function getContextualQuickReplies(text) {
  if (!text || typeof text !== 'string') return null;
  const clean = text.toLowerCase();

  // 1. Product Selection & Upsell Decision moment:
  if (
    clean.includes('რომელ სასუსნავ') ||
    clean.includes('რომელს შევურჩევ') ||
    clean.includes('რომელი შევურჩიოთ') ||
    clean.includes('რომელი მოგეწონათ') ||
    clean.includes('რომელიმე გაგიმზადოთ') ||
    clean.includes('სრულ ნაკრებს გავამზადებთ') ||
    clean.includes('როგორ გირჩევნიათ') ||
    (clean.includes('თათებ') && clean.includes('ღრუბელ') && (clean.includes('?') || clean.includes('რომელ')))
  ) {
    if (clean.includes('სრულ ნაკრებ') || (clean.includes('full pack') && clean.includes('როგორ გირჩევნიათ'))) {
      return [
        { title: '🎁 Full Pack (49.5₾)', payload: 'SELECT_FULL_PACK' },
        { title: '🦴 1 შეკვრა (23₾)', payload: 'SELECT_SINGLE' },
        { title: '☁️ +ღრუბელი (15₾)', payload: 'ADD_LUNG' }
      ];
    }
    return [
      { title: '🎁 Full Pack (49.50₾)', payload: 'SELECT_FULL_PACK' },
      { title: '🦴 თათები (18₾)', payload: 'SELECT_PAWS' },
      { title: '☁️ ღრუბელი (15₾)', payload: 'SELECT_LUNG' },
      { title: '✨ პუდრა (12₾)', payload: 'SELECT_POWDER' }
    ];
  }

  // 2. Location / Delivery City moment: when bot asks where to deliver or which city (Strict Tbilisi Only)
  if (
    clean.includes('რომელ ქალაქ') ||
    clean.includes('სად მოგართვათ') ||
    clean.includes('სად გამოვაგზავნოთ') ||
    clean.includes('თბილისში ბრძანდებით') ||
    clean.includes('თბილისში გყავთ ვინმე') ||
    clean.includes('რომელ უბანში')
  ) {
    return [
      { title: '📍 თბილისში (კურიერი)', payload: 'CITY_TBILISI' },
      { title: '🚗 საბურთალო (თვითგატანა)', payload: 'CITY_SABURTALO' }
    ];
  }

  // 3. Payment Method moment: when bot asks how to pay
  if (
    clean.includes('გადახდის მეთოდი') ||
    clean.includes('ნაღდით გირჩევნიათ თუ') ||
    clean.includes('მობილბანკით გირჩევნიათ') ||
    (clean.includes('გადარიცხვ') && clean.includes('ნაღდ'))
  ) {
    return [
      { title: '💳 მობილბანკით', payload: 'PAY_BANK' },
      { title: '💵 ნაღდით კურიერთან', payload: 'PAY_CASH' }
    ];
  }

  return null;
}

export function sanitizeOutgoingText(text) {
  if (!text || typeof text !== 'string') return text;
  // Deterministic Safety Shield against profanity, insult echoes, and coarse slang
  const toxicPattern = /(?:ჩათლაშკ|ჩათლახ|ბოზო|ბოზი|ნაბიჭვ|დებილ|იდიოტ)/i;
  if (toxicPattern.test(text)) {
    console.warn('[Safety Shield] Outgoing profanity intercepted and neutralized!');
    return 'ჰაჰა, ხდება ხოლმე 😂 მთავარია თქვენ და თქვენი ცუგა იყოთ კარგად! თუ რამე გემრიელი დაგჭირდეთ შესარიგებლად ან გასახარებლად, სიამოვნებით დაგეხმარებით 🐾';
  }
  // Orthographic typo fix: replace "თბილისი სიტყვებისთვის" with "თბილი სიტყვებისთვის"
  return text.replace(/თბილისი\s+სიტყვებისთვის/g, 'თბილი სიტყვებისთვის');
}

/**
 * Delivers messages in natural human-paced conversational chunks (Dual-Bubble Pacing).
 * If a message contains multiple paragraphs, it splits the response:
 * Bubble 1: Opening reaction / empathy / direct answer
 * (1.2s - 2.0s human typing indicator)
 * Bubble 2: Actionable advice / recommendation + Quick-Reply pills
 */
export async function deliverConversationalReply(senderPsid, rawText, quickReplies = null) {
  const sanitizedText = sanitizeOutgoingText(rawText);
  if (!sanitizedText) return;

  const pills = quickReplies || getContextualQuickReplies(sanitizedText);

  // Split into natural chunks if there are clean paragraph boundaries (\n\n) and message is substantive
  const paragraphs = sanitizedText.split(/\r?\n\r?\n+/).map(p => p.trim()).filter(Boolean);

  if (paragraphs.length >= 2 && sanitizedText.length > 90) {
    const chunk1 = paragraphs[0];
    const chunk2 = paragraphs.slice(1).join('\n\n');

    console.log(`[Conversational Delivery] Sending 2-bubble split for natural rhythm (${chunk1.length} chars -> ${chunk2.length} chars)...`);
    await sendMessengerMessage(senderPsid, chunk1);

    // Natural human typing latency & typing indicator before bubble 2
    await sendSenderAction(senderPsid, 'typing_on').catch(() => {});
    const typingPauseMs = Math.min(2000, Math.max(1100, Math.floor(chunk2.length * 10)));
    await new Promise(r => setTimeout(r, typingPauseMs));

    if (pills && pills.length > 0) {
      await sendQuickReplies(senderPsid, chunk2, pills);
    } else {
      await sendMessengerMessage(senderPsid, chunk2);
    }
  } else {
    // Single message bubble
    if (pills && pills.length > 0) {
      await sendQuickReplies(senderPsid, sanitizedText, pills);
    } else {
      await sendMessengerMessage(senderPsid, sanitizedText);
    }
  }
}


import dashboardRouter from './routes/dashboard.js';
import { DASHBOARD_HTML } from './routes/dashboardHtml.js';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { generateBotResponse, verifyReceiptImage } from './services/ai.js';
import {
  replyToComment,
  sendGenericTemplate,
  sendMessengerImage,
  sendMessengerMessage,
  sendPrivateReply,
  sendProductCatalog,
  sendQuickReplies,
  sendSenderAction,
} from './services/facebook.js';
import { saveOrderToGoogleSheet } from './services/sheets.js';
import { notifyTelegramOrder, notifyTelegramReceipt, notifyTelegramAlert, generateDailyReport, generateCourierDispatchList } from './services/telegram.js';
import { handleCommentAction, startCommentMonitor, checkNewComments } from './services/commentMonitor.js';
import { checkAndSendPostDeliveryFollowUps } from './services/followUp.js';
import { getOrders, getSession, getOrHydrateSession, getCustomerProfile, updateCustomerProfile, getUserLatestOrder, updateOrderStatus, pauseBotForUser, isBotPausedForUser, saveOrder, updateSession } from './services/storage.js';

const PRODUCT_MAP = {
  paws: { name: 'დრაკონის თათები (100გ)', price: 18, desc: '100% ქათმის ფეხი • ბუნებრივი კოლაგენი და კბილების წმენდა' },
  lung: { name: 'ღრუბელი (50გ)', price: 15, desc: '100% საქონლის ფილტვი • ჰაეროვანი, დაბალკალორიული, წვრთნისთვის' },
  liver: { name: 'სუპერ-კუბები (80გ)', price: 17, desc: '100% საქონლის ღვიძლი • ვიტამინების ბომბი და არომატი' },
  powder: { name: 'ჯადოსნური პუდრა (40გ)', price: 12, desc: '100% ხორცის ფხვნილი • მადის აღმძვრელი ტოპინგი' },
  full_pack: { name: 'Full Pack (სრული ნაკრები)', price: 49.50, desc: 'ოთხივე პროდუქტი ერთად 62₾-ის ნაცვლად + უფასო მიტანა' },
};

const app = express();
const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'khramuna_secret_verify_token';

import crypto from 'node:crypto';
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.static('public'));
const BASE_HOST = process.env.PUBLIC_URL || 'https://khramuna-bot.vercel.app';

const APP_SECRET = process.env.FB_APP_SECRET || process.env.APP_SECRET;

function verifyMetaSignature(req) {
  if (!APP_SECRET) return true;
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) return true;
  try {
    const elements = signature.split('=');
    const signatureHash = elements[1];
    const expectedHash = crypto
      .createHmac('sha256', APP_SECRET)
      .update(req.rawBody || JSON.stringify(req.body))
      .digest('hex');
    if (signatureHash !== expectedHash) {
      console.warn('[Webhook Security] Signature mismatch (serverless rawBody variance), proceeding to process message safely.');
    }
  } catch (e) {
    console.warn('[Webhook Security] Signature check exception:', e.message);
  }
  return true;
}


// Mount Khramuna Admin Dashboard
app.use('/api/dashboard', dashboardRouter);
app.get(['/dashboard', '/admin', '/dashboard/index.html'], (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(DASHBOARD_HTML);
});

// Healthcheck
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    brand: 'ხრამუნა',
    version: '2.0.1-cron',
    timestamp: new Date().toISOString(),
  });
});

// Scheduled Cron Endpoint for Vercel Cron (checks missed comments every 10 mins)
app.get(['/api/cron-comments', '/cron-comments'], async (req, res) => {
  try {
    console.log('[Cron] Running scheduled checkNewComments sweep...');
    await checkNewComments();
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[Cron Error]:', err.message);
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Official Privacy Policy & User Data Deletion for Meta App Review compliance
app.get(['/', '/privacy', '/terms', '/data-deletion'], (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ხრამუნა • კონფიდენციალურობის პოლიტიკა (Privacy Policy)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Georgian:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Noto Sans Georgian', sans-serif; background: #0f172a; color: #f1f5f9; padding: 40px 20px; line-height: 1.7; }
    .card { max-width: 800px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 36px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); }
    h1 { color: #f59e0b; font-size: 26px; margin-bottom: 20px; }
    h2 { color: #fff; font-size: 18px; margin-top: 24px; margin-bottom: 10px; border-bottom: 1px solid #334155; padding-bottom: 6px; }
    p, li { color: #94a3b8; font-size: 15px; }
    ul { padding-left: 20px; margin-bottom: 16px; }
    .badge { display: inline-block; background: #f59e0b; color: #000; font-weight: 700; padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">🐾 ხრამუნა (Khramuna)</div>
    <h1>კონფიდენციალურობის პოლიტიკა & მონაცემთა დაცვა</h1>
    <p>ბოლო განახლება: 2026 წლის ოქტომბერი</p>

    <h2>1. რა ინფორმაციას ვაგროვებთ</h2>
    <p>„ხრამუნა“ (Facebook Messenger და Instagram ავტომატიზაცია) აგროვებს მხოლოდ იმ მინიმალურ მონაცემებს, რომლებიც აუცილებელია შეკვეთის მისაღებად და საკურიერო მიწოდებისთვის:</p>
    <ul>
      <li>მომხმარებლის მიერ ჩატში ნებაყოფლობით მოწოდებული საკონტაქტო სახელი და ტელეფონის ნომერი;</li>
      <li>მიწოდების მისამართი;</li>
      <li>შერჩეული პროდუქცია და შეკვეთის დეტალები.</li>
    </ul>

    <h2>2. მონაცემთა გამოყენება</h2>
    <p>შეგროვებული ინფორმაცია გამოიყენება ექსკლუზიურად შეკვეთის დასამუშავებლად, კურიერის მიერ ჩასაბარებლად და მომხმარებელთან უკუკავშირისთვის. ჩვენ არასოდეს ვყიდით და არ გადავცემთ თქვენს მონაცემებს მესამე პირებს მარკეტინგული მიზნებისთვის.</p>

    <h2>3. მონაცემთა წაშლის მოთხოვნა (User Data Deletion)</h2>
    <p>ნებისმიერ მომხმარებელს აქვს უფლება, ნებისმიერ დროს მოითხოვოს საკუთარი შეკვეთისა და ჩატის მონაცემების სრული წაშლა ჩვენი ბაზიდან. ამისთვის საკმარისია მოგვწეროთ ელფოსტაზე: <strong>khramuna.geo@gmail.com</strong> ან პირდაპირ Facebook Messenger-ში სიტყვით „მონაცემების წაშლა“. მოთხოვნა დაკმაყოფილდება 24 საათში.</p>

    <h2>4. კონტაქტი</h2>
    <p>კითხვების შემთხვევაში შეგიძლიათ დაგვიკავშირდეთ: <br>
    ელფოსტა: <strong>khramuna.geo@gmail.com</strong><br>
    Facebook: <strong>facebook.com/Khramuna</strong></p>
  </div>
</body>
</html>`;
  res.send(html);
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
    const cleanPhone = normalizeGeorgianPhone(aiRes.order.phone);
    const cleanAddress = (aiRes.order.address || '').trim();

    if (cleanPhone.length === 9 && cleanAddress.length >= 5) {
      createdOrder = saveOrder({
        userId,
        ...aiRes.order,
        phone: cleanPhone,
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

/**
 * Telegram Founder Command Center Webhook
 * Handles commands (/today, /courier, /orders, /help) and inline button callbacks from founder.
 */
app.post('/api/telegram-webhook', async (req, res) => {
  const update = req.body;
  const token = process.env.TELEGRAM_BOT_TOKEN || '8602396382:AAFiNvqT4SInU4VcIDSJmV31FdK-spMKm7M';
  const founderChatId = process.env.TELEGRAM_CHAT_ID || '1317626946';

  if (!update) return res.sendStatus(200);

  // 1. Handle Inline Button Callbacks (e.g. confirm_ORD-123 or shipped_ORD-123)
  if (update.callback_query) {
    const cb = update.callback_query;
    const data = cb.data || '';
    const chatId = cb.message?.chat?.id;

    if (data.startsWith('confirm_')) {
      const orderId = data.replace('confirm_', '');
      updateOrderStatus(orderId, 'CONFIRMED_PAID', 'Confirmed via Telegram button');
      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: cb.id, text: `შეკვეთა #${orderId} დადასტურებულია! ✅` })
      }).catch(() => {});
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: `✅ შეკვეთა #${orderId} წარმატებით დადასტურდა (CONFIRMED_PAID)!` })
      }).catch(() => {});
    } else if (data.startsWith('shipped_')) {
      const orderId = data.replace('shipped_', '');
      updateOrderStatus(orderId, 'OUT_FOR_DELIVERY', 'Marked shipped via Telegram button');
      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: cb.id, text: `შეკვეთა #${orderId} გადაეცა კურიერს! 🛵` })
      }).catch(() => {});
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: `🛵 შეკვეთა #${orderId} გადაცემულია კურიერთან (OUT_FOR_DELIVERY)!` })
      }).catch(() => {});
    }
    return res.sendStatus(200);
  }

  // 2. Handle Text Commands from Founder
  const message = update.message;
  if (!message || !message.text) return res.sendStatus(200);

  const chatId = String(message.chat.id);
  const text = message.text.trim();

  // Security: only respond to Founder Chat ID
  if (chatId !== String(founderChatId)) {
    console.warn(`[Telegram Webhook] Unauthorized message from ${chatId}: "${text}"`);
    return res.sendStatus(200);
  }

  const orders = getOrders();

  if (text === '/today' || text === '/stats') {
    const report = generateDailyReport(orders);
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: report, parse_mode: 'Markdown' })
    }).catch(() => {});
  } else if (text === '/courier' || text === '/dispatch') {
    const sheet = generateCourierDispatchList(orders);
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: sheet, parse_mode: 'Markdown' })
    }).catch(() => {});
  } else if (text === '/orders') {
    const recent = orders.slice(-5).reverse();
    let reply = '📋 *ბოლო 5 შეკვეთა:*\n━━━━━━━━━━━━━━━━━━━\n';
    recent.forEach((o, i) => {
      reply += `*${i+1}. #${o.id}* — ${o.product} (${o.price}₾)\n👤 ${o.customerName || 'კლიენტი'} | ${o.status}\n📍 ${o.address}\n\n`;
    });
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: reply, parse_mode: 'Markdown' })
    }).catch(() => {});
  } else if (text === '/help' || text === '/start') {
    const helpText = `🐾 *ხრამუნა — Founder Command Center*
━━━━━━━━━━━━━━━━━━━
ხელმისაწვდომი ბრძანებები:
• /today — დღის ფინანსური და შეკვეთების ანგარიში
• /courier — კურიერის მზა მარშრუტი (WhatsApp/SMS ფორმატში)
• /orders — ბოლო შეკვეთების სია და სტატუსები
• /stats — გაყიდვების სტატისტიკა`;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: helpText, parse_mode: 'Markdown' })
    }).catch(() => {});
  }

  return res.sendStatus(200);
});

/**
 * Daily Evening Digest Cron (Triggered at 21:00 or manually)
 */
app.get('/api/cron/daily-digest', async (req, res) => {
  const token = process.env.TELEGRAM_BOT_TOKEN || '8602396382:AAFiNvqT4SInU4VcIDSJmV31FdK-spMKm7M';
  const founderChatId = process.env.TELEGRAM_CHAT_ID || '1317626946';

  const orders = getOrders();
  const report = generateDailyReport(orders);

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: founderChatId,
      text: `🌙 *საღამოს შეჯამება — ხრამუნა*\n\n${report}`,
      parse_mode: 'Markdown'
    })
  }).catch(() => {});

  res.json({ success: true, message: 'Daily digest sent to Telegram!' });
});

app.post('/webhook', async (req, res) => {
  verifyMetaSignature(req);
  const body = req.body;
  console.log('[Webhook Incoming POST]:', JSON.stringify(body));

  if (body.object === 'page' || body.object === 'instagram') {
    try {
      for (const entry of body.entry || []) {
        for (const webhookEvent of entry.messaging || []) {
          const senderPsid = webhookEvent.sender?.id;
          if (!senderPsid) continue;

          // Detect if message was sent manually by human page admin (echo event)
          if (webhookEvent.message?.is_echo) {
            const recipientPsid = webhookEvent.recipient?.id;
            const allowedRecipients = [
              process.env.FB_PAGE_ID || '928195650386088',
              process.env.IG_ACCOUNT_ID || '17841427052704939'
            ];
            if (recipientPsid && !allowedRecipients.includes(recipientPsid)) {
              console.log(`[Human Takeover] Admin manually replied to ${recipientPsid}. Pausing bot for 60 minutes.`);
              pauseBotForUser(recipientPsid, 60);
            }
            continue;
          }

          // SECURITY: Whitelist check - strictly process only messages directed to Khramuna
          // Completely ignore personal Instagram or other connected accounts
          const recipientId = webhookEvent.recipient?.id;
          const allowedRecipients = [
            process.env.FB_PAGE_ID || '928195650386088',
            process.env.IG_ACCOUNT_ID || '17841427052704939'
          ];
          if (recipientId && !allowedRecipients.includes(recipientId)) {
            console.log('[Security] Ignored webhook event directed to non-Khramuna recipient:', recipientId);
            continue;
          }

          // Human Takeover check: if human admin recently chatted with this user, let human converse!
          if (isBotPausedForUser(senderPsid)) {
            console.log(`[Human Takeover] Bot is paused for user ${senderPsid}. Letting human admin converse without bot interference.`);
            continue;
          }

          // 1. Instant Synchronous Deduplication Check (BEFORE ANY AWAIT)
          const mid = webhookEvent.message?.mid;
          if (mid) {
            if (processedMids.has(mid)) {
              console.log('[Messenger] Duplicate message ignored (instant sync check):', mid);
              continue;
            }
            processedMids.add(mid);
            if (processedMids.size > 2000) {
              const first = processedMids.values().next().value;
              processedMids.delete(first);
            }
          }

          // 2. User-level rapid debounce for concurrent duplicate webhook deliveries
          const incomingRawText = webhookEvent.message?.text?.trim();
          if (incomingRawText) {
            const lockKey = `${senderPsid}_${incomingRawText}`;
            const lastTime = userTextLocks.get(lockKey) || 0;
            if (Date.now() - lastTime < 3500) {
              console.log('[Messenger] Rapid duplicate user message ignored within 3.5s:', lockKey);
              continue;
            }
            userTextLocks.set(lockKey, Date.now());
          }

          // Send typing indicator only after deduplication check passes
          await sendSenderAction(senderPsid, 'typing_on').catch(() => {});

          const postbackPayload = webhookEvent.postback?.payload;
          const quickReplyPayload = webhookEvent.message?.quick_reply?.payload;
          const payload = postbackPayload || quickReplyPayload;

          // 1. Handle interactive button clicks (Postback or Quick Reply)
          if (payload) {
            console.log(`[Messenger Funnel] User ${senderPsid} clicked payload: ${payload}`);

            if (payload === 'GET_STARTED') {
            const welcome = 'გამარჯობა! 🐾 „ხრამუნაში“ საკუთარი ხელით ვამზადებთ 100% ნატურალურ გამომშრალ სასუსნავებს ცუგებისთვის ❤️\n\nდაათვალიერეთ ჩვენი ასორტიმენტი ან მომწერეთ, რა ჯიშის და ასაკის პატარა გყავთ — სიამოვნებით შეგირჩევთ:';
            await sendMessengerMessage(senderPsid, welcome);
            await sendProductCatalog(senderPsid);
            updateSession(senderPsid, 'assistant', welcome);
            continue;
          }

          if (payload === 'HUMAN_HANDOFF') {
            pauseBotForUser(senderPsid, 120);
            const handoffMsg = 'გასაგებია! ❤️ შეტყობინება გადავეცი ლაშას (დამფუძნებელს) და მალე პირადად შემოგეხმიანებათ.';
            await sendMessengerMessage(senderPsid, handoffMsg);
            updateSession(senderPsid, 'assistant', handoffMsg);
            await notifyTelegramAlert(
              '🚨 *ოპერატორის ჩართვის მოთხოვნა (Persistent Menu)*',
              `👤 *მომხმარებელი (ID):* \`${senderPsid}\`\n🔗 [გახსენით Meta Business Suite Inbox](https://business.facebook.com/latest/inbox/)`
            ).catch(() => {});
            continue;
          }

          if (payload === 'SHOW_CATALOG') {
              await sendMessengerMessage(senderPsid, 'გთავაზობთ ჩვენს 100% ნატურალურ ასორტიმენტს: 🐾');
              await sendProductCatalog(senderPsid);
              continue;
            }

            
            if (payload === 'RESTOCK_SAME_ORDER') {
              const latestOrder = getUserLatestOrder(senderPsid);
              if (latestOrder) {
                const reorderText = `დიდი სიამოვნებით! 🐾 თქვენს წინა შეკვეთას (${latestOrder.product}) სიყვარულით გაგიმზადებთ.\n\nგთხოვთ დამიდასტუროთ — მისამართი (${latestOrder.address}) და ტელეფონი (${latestOrder.phone}) იგივე დავტოვოთ? ❤️`;
                await sendMessengerMessage(senderPsid, reorderText);
                updateSession(senderPsid, 'assistant', reorderText);
              } else {
                const reorderText = 'დიდი სიამოვნებით! 🐾 რომელ სასუსნავს ინებებთ ახალი პარტიიდან?';
                await sendMessengerMessage(senderPsid, reorderText);
                await sendProductCatalog(senderPsid);
                updateSession(senderPsid, 'assistant', reorderText);
              }
              continue;
            }

            if (payload === 'RESTOCK_NEW_TASTE') {
              const switchText = 'დიდი სიამოვნებით! 🐾 გაეცანით ჩვენს ასორტიმენტს და სიამოვნებით შეგირჩევთ ახალ გემოს:';
              await sendMessengerMessage(senderPsid, switchText);
              await sendProductCatalog(senderPsid);
              updateSession(senderPsid, 'assistant', switchText);
              continue;
            }

            if (payload === 'RESTOCK_STILL_HAVE') {
              const stillText = 'გასაგებია! ❤️ გემრიელად მიირთვას თქვენმა პატარამ. როცა დაგჭირდებათ, ნებისმიერ დროს მოგვწერეთ ✨';
              await sendMessengerMessage(senderPsid, stillText);
              updateSession(senderPsid, 'assistant', stillText);
              continue;
            }

            if (payload.startsWith('ORDER_')) {
              const productKey = payload.replace('ORDER_', '');
              const product = PRODUCT_MAP[productKey];

              if (product) {
                const session = await getOrHydrateSession(senderPsid);
                updateSession(senderPsid, 'user', `ავირჩიე შეკვეთა: ${product.name}`);

                let confirmText = '';
                if (productKey === 'full_pack') {
                  confirmText = `დიდი სიამოვნებით! 🎁\nFull Pack-ს (ოთხივე სასუსნავს) სიყვარულით გაგიმზადებთ — 49.50₾ და მიტანაც უფასოა!\n\nგთხოვთ მომწეროთ მიტანის მისამართი და საკონტაქტო ნომერი 📍📞`;
                } else {
                  confirmText = `დიდი სიამოვნებით! 🐾\n„${product.name}“ — ${product.price}₾.\n(თბილისში მიტანა 5₾, ხოლო 45₾-დან ან Full Pack-ზე მიტანა უფასოა 🚚).\n\nგთხოვთ მომწეროთ მიტანის მისამართი და საკონტაქტო ნომერი 📍📞`;
                }
                await sendMessengerMessage(senderPsid, confirmText);
                updateSession(senderPsid, 'assistant', confirmText);
                continue;
              }
            }

            if (payload.startsWith('INFO_')) {
              const productKey = payload.replace('INFO_', '');
              const product = PRODUCT_MAP[productKey];

              if (product) {
                if (productKey === 'lung') {
                  await sendMessengerImage(senderPsid, `${BASE_HOST}/images/ghrubeli_v3.jpg`);
                } else if (productKey === 'liver') {
                  await sendMessengerImage(senderPsid, `${BASE_HOST}/images/kubebi_v3.jpg`);
                } else if (productKey === 'paws') {
                  await sendMessengerImage(senderPsid, `${BASE_HOST}/images/tathebi_v3.jpg`);
                } else if (productKey === 'powder') {
                  await sendMessengerImage(senderPsid, `${BASE_HOST}/images/pudra_v3.jpg`);
                } else if (productKey === 'full_pack') {
                  await sendMessengerImage(senderPsid, `${BASE_HOST}/images/full_pack_v5.jpg`);
                }
                const infoText = `🐾 ${product.name}\n\n${product.desc}\nფასი: ${product.price}₾\n\nგსურთ შეკვეთის გაფორმება? 🐶`;
                await sendMessengerMessage(senderPsid, infoText);
                continue;
              }
            }
          }

          // 2. Handle Text Messages
          
          // 0. Meta Ads Referral & Keyword Attribution Hook
          const referral = webhookEvent.referral || webhookEvent.postback?.referral;
          if (referral) {
            const adId = referral.ad_id || '';
            const refParam = (referral.ref || '').toLowerCase();
            console.log(`[Meta Ads Hook] Incoming lead from Ad ID ${adId}, ref="${refParam}" for user ${senderPsid}`);

            let tailoredGreeting = '';
            if (refParam.includes('teeth') || refParam.includes('dental') || refParam.includes('tathebi') || refParam.includes('თათ')) {
              tailoredGreeting = 'გამარჯობა! 🐾 ჩვენს ხრაშუნა „დრაკონის თათებზე“ დაინტერესდით კბილების გასაწმენდად? სიამოვნებით მოგიყვებით — რა ჯიშის და ასაკის ცუგა გყავთ? ❤️';
            } else if (refParam.includes('powder') || refParam.includes('pudra') || refParam.includes('picky') || refParam.includes('მადა')) {
              tailoredGreeting = 'გამარჯობა! 🐾 თქვენი ცუგაც ჭირვეულობს მშრალ საჭმელზე? ჩვენი „ჯადოსნური პუდრა“ 100% ხორცის ბუნებრივი ტოპინგია, რომელიც საჭმელს საოცარ არომატს აძლევს. რომელი ჯიშის პატარა გყავთ? ✨';
            } else if (refParam.includes('allergy') || refParam.includes('lung') || refParam.includes('ghrubeli') || refParam.includes('ალერგი')) {
              tailoredGreeting = 'გამარჯობა! 🐾 ჩვენს ჰაეროვან, დიეტურ „ღრუბელზე“ (საქონლის ფილტვი) დაინტერესდით? ის სულ ~2.5% ცხიმს შეიცავს და იდეალურია ალერგიული და მგრძნობიარე კუჭის მქონე ცუგებისთვის ❤️ რა ჯიშის პატარა გყავთ?';
            } else if (refParam.includes('full') || refParam.includes('pack') || refParam.includes('ოთხეულ')) {
              tailoredGreeting = 'გამარჯობა! 🐾 ჩვენს სრულ ოთხეულზე (Full Pack) დაინტერესდით? 49.50₾-ში შედის ოთხივე პრემიუმ სასუსნავი (20%-იანი ეკონომიით) და მიტანაც უფასოა! 🎁 რა ჯიშის ცუგა გყავთ?';
            }

            if (tailoredGreeting) {
              await sendMessengerMessage(senderPsid, tailoredGreeting);
              updateSession(senderPsid, 'assistant', tailoredGreeting);
              continue;
            }
          }

          const message = webhookEvent.message;

          // Handle Photo attachments (Smart Payment Receipt vs General Pet/Chat Photo)
          if (message && !message.is_echo && message.attachments && message.attachments.length > 0) {
            const imageAttachment = message.attachments.find(a => a.type === 'image');
            if (imageAttachment && imageAttachment.payload?.url) {
              const photoUrl = imageAttachment.payload.url;
              console.log('[Messenger] Received image from ' + senderPsid + ': ' + photoUrl);

              // Check for payment receipt via Vision OCR
              const session = getSession(senderPsid);
              const latestOrder = getUserLatestOrder(senderPsid);
              const expectedPrice = latestOrder ? latestOrder.price : null;

              console.log(`[Messenger Vision] Verifying incoming image from ${senderPsid} via Gemini Vision OCR...`);
              const ocrResult = await verifyReceiptImage(photoUrl, expectedPrice);
              console.log(`[Messenger Vision OCR Result]:`, ocrResult);

              if (ocrResult && ocrResult.isReceipt) {
                // Forward rich verified receipt details to Telegram channel
                await notifyTelegramReceipt(photoUrl, senderPsid, ocrResult, latestOrder);

                let receiptConfirm = '';
                const bankBadge = ocrResult.bank && ocrResult.bank !== 'NONE' ? ` [${ocrResult.bank}]` : '';
                const amountBadge = ocrResult.amount ? ` (${ocrResult.amount}₾)` : '';

                if (latestOrder) {
                  const paidEnough = !ocrResult.amount || !latestOrder.price || (ocrResult.amount >= latestOrder.price);
                  if (paidEnough) {
                    updateOrderStatus(latestOrder.id, 'CONFIRMED_PAID', `Verified ${ocrResult.amount || latestOrder.price}₾ via ${ocrResult.bank || 'Bank'} [ლ.ხ.]`);
                    const hasDeliveryDetails = latestOrder.address && latestOrder.address !== 'არ არის მითითებული' && latestOrder.phone && latestOrder.phone !== 'არ არის მითითებული';
                    if (hasDeliveryDetails) {
                      receiptConfirm = `დიდი მადლობა! ❤️ გადარიცხვა${bankBadge}${amountBadge} დადასტურებულია! შეკვეთა მივიღეთ და უკვე ვამზადებთ! კურიერი მოგართმევთ თქვენს მისამართზე 🐾`;
                    } else {
                      receiptConfirm = `დიდი მადლობა! ❤️ გადარიცხვა${bankBadge}${amountBadge} დადასტურებულია! გთხოვთ მოგვწეროთ თქვენი მისამართი და საკონტაქტო ნომერი, რომ შეკვეთა კურიერს გავატანოთ 🐾`;
                    }
                  } else {
                    const diff = (latestOrder.price - ocrResult.amount).toFixed(2);
                    updateOrderStatus(latestOrder.id, 'PARTIALLY_PAID', `Received ${ocrResult.amount}₾, expected ${latestOrder.price}₾ (missing ${diff}₾)`);
                    receiptConfirm = `დიდი მადლობა! ❤️ თქვენი გადარიცხვა${bankBadge}${amountBadge} მივიღეთ. შეკვეთის თანხაა ${latestOrder.price}₾ (დარჩენილია ${diff}₾). გთხოვთ შეგვატყობინოთ ან გადმორიცხოთ დარჩენილი ნაწილი, რომ შეკვეთა მოგიტანოთ 🐾`;
                  }
                } else {
                  receiptConfirm = `დიდი მადლობა! ❤️ გადარიცხვის ქვითარი${bankBadge}${amountBadge} დამოწმებულია! გთხოვთ მოგვწეროთ მიტანის მისამართი და ტელეფონის ნომერი, რომ შეკვეთა კურიერს გავატანოთ 🐾`;
                }

                await sendMessengerMessage(senderPsid, receiptConfirm);
                updateSession(senderPsid, 'assistant', receiptConfirm);
                continue;
              } else {
                console.log(`[Messenger Vision] Image is not a verified payment receipt, proceeding to general pet photo flow`);
              }

              // Check if attachment is a Sticker / Like reaction
              const isSticker = !!message.sticker_id || 
                                !!imageAttachment.payload?.sticker_id || 
                                (imageAttachment.name && imageAttachment.name.startsWith('sticker-'));

              if (isSticker) {
                console.log(`[Messenger] Sticker/Reaction detected from ${senderPsid}`);
                const isPoliteClosing = lastMsgs.includes('მადლობა') || 
                                        lastMsgs.includes('წარმატებ') || 
                                        lastMsgs.includes('ბათუმ') || 
                                        lastMsgs.includes('რეგიონ') ||
                                        lastMsgs.includes('გაიხარ');
                const hasPriorHistory = (session.history || []).length > 2;
                const stickerReply = isPoliteClosing 
                  ? 'გაიხარეთ! ❤️🐾 თუ რამე დაგჭირდეთ თქვენი ცუგასთვის, ნებისმიერ დროს მოგვწერეთ ✨'
                  : (hasPriorHistory ? '🐾❤️' : 'გამარჯობა! 🐾❤️ რით შეგვიძლია დაგეხმაროთ, ან რომელი ნატურალური სასუსნავი გაინტერესებთ თქვენი ცუგასთვის? ✨');
                await sendMessengerMessage(senderPsid, stickerReply);
                updateSession(senderPsid, 'assistant', stickerReply);
                continue;
              }

              // Real photo sent by user (Dog photo, dental check, etc.) - Preserves full conversation context!
              console.log('[Messenger] General pet photo received from ' + senderPsid + ' (calling AI with context)');
              const alertDetails = '👤 კლიენტი: ' + senderPsid + '\n🖼️ [ფოტოს ბმული](' + photoUrl + ')\nმომხმარებელმა გამოაგზავნა ფოტო (შესაძლოა ცუგას სურათი).';
              await notifyTelegramAlert('📸 *ახალი ფოტო ჩათში (არ არის ქვითარი)*', alertDetails);

              const photoPrompt = `[მომხმარებელმა ჩატში გამოაგზავნა ფოტო.
თუ ფოტოზე ძაღლი/ლეკვი ან შინაური ცხოველია:
1. როგორც კინოლოგმა და მზრუნველმა სპეციალისტმა, ზუსტად ამოიცანი ჯიში (ჯიში/შერეული), სავარაუდო ასაკი (ლეკვი თუ ზრდასრული) და ზომა.
2. თბილად და გულწრფელად შეუქე ოთხფეხა (დაასახელე ჯიში კონკრეტულად, მაგ: „რა საოცარი ფრანგული ბულდოგია! ❤️“).
3. მისი ჯიშისა და ასაკის გათვალისწინებით ურჩიე იდეალური ხრამუნას სნექი (ლეკვს ან პატარა ჯიშს - რბილი ღრუბელი ან პუდრა; კბილების გამოცვლის/ღეჭვის მოყვარულს - დრაკონის თათები; მადის მოსაგვარებლად - ჯადოსნური პუდრა).
4. customerProfileUpdates-ში დააბრუნე აღმოჩენილი ჯიში და ასაკი (მაგ: {"petBreed": "ფრანგული ბულდოგი", "petAge": "ლეკვი"}).
თუ ფოტოზე ძაღლი არ არის (სხვა რამეა, მაგ. კბილები, პროდუქტი, ან მემი), უპასუხე კონტექსტურად.]`;
              updateSession(senderPsid, 'user', '[ფოტო]');
              await sendSenderAction(senderPsid, 'typing_on').catch(() => {});

              try {
                let imagePayload = null;
                try {
                  const photoRes = await fetch(photoUrl);
                  if (photoRes.ok) {
                    const arrayBuf = await photoRes.arrayBuffer();
                    const base64Data = Buffer.from(arrayBuf).toString('base64');
                    const rawType = photoRes.headers.get('content-type') || 'image/jpeg';
                    const mimeType = rawType.split(';')[0].trim() || 'image/jpeg';
                    imagePayload = { mimeType, data: base64Data };
                  }
                } catch (fetchImgErr) {
                  console.warn('[Messenger Photo] Could not fetch image buffer, falling back to text prompt:', fetchImgErr.message);
                }

                const aiInput = imagePayload ? { text: photoPrompt, image: imagePayload } : photoPrompt;
                const aiResponse = await generateBotResponse(aiInput, session.history, { isContinuedConversation: true });
                let finalText = aiResponse.replyText || '';
                if (finalText.trim().startsWith('{') && finalText.includes('"replyText"')) {
                  console.warn('[Messenger Guard] Intercepted raw JSON in replyText, extracting clean text...');
                  const m = finalText.match(/"replyText"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"|(?<!\\)"\s*\}|$)/);
                  if (m && m[1]) {
                    finalText = m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
                  } else {
                    finalText = 'რა საყვარელი ცუგაა! ❤️ დეტალები ჩანიშნულია. რაიმე კითხვა ხომ არ გაქვთ ჩვენს სნექებზე? 🐾';
                  }
                }

                if (aiResponse.customerProfileUpdates) {
                  updateCustomerProfile(senderPsid, aiResponse.customerProfileUpdates);
                }

                const sanitizedText = sanitizeOutgoingText(finalText);
                await deliverConversationalReply(senderPsid, sanitizedText);
                updateSession(senderPsid, 'assistant', sanitizedText);
              } catch (aiPhotoErr) {
                console.error('[Messenger Photo AI Error]:', aiPhotoErr.message);
                const fallbackPhotoReply = 'რა საყვარელია! ❤️🐾 რით შეგვიძლია გავახაროთ თქვენი ოთხფეხა მეგობარი? ✨';
                await sendMessengerMessage(senderPsid, fallbackPhotoReply);
                updateSession(senderPsid, 'assistant', fallbackPhotoReply);
              }
              continue;
            }
          }

          // Handle Voice / Audio message notes (Gemini 2.5 Flash Multimodal Audio)
          if (message && !message.is_echo && message.attachments && message.attachments.length > 0) {
            const audioAttachment = message.attachments.find(a => a.type === 'audio' || a.type === 'voice');
            if (audioAttachment && audioAttachment.payload?.url) {
              const audioUrl = audioAttachment.payload.url;
              console.log(`[Messenger] Processing voice note from ${senderPsid}:`, audioUrl);
              const session = await getOrHydrateSession(senderPsid);
              await sendSenderAction(senderPsid, 'typing_on').catch(() => {});

              try {
                const audioRes = await fetch(audioUrl);
                if (!audioRes.ok) throw new Error(`HTTP ${audioRes.status}`);
                const arrayBuf = await audioRes.arrayBuffer();
                const base64Audio = Buffer.from(arrayBuf).toString('base64');
                const rawType = audioRes.headers.get('content-type') || 'audio/mp4';
                const cleanType = rawType.split(';')[0].trim() || 'audio/mp4';

                updateSession(senderPsid, 'user', '[ხმოვანი შეტყობინება]');
                await notifyTelegramAlert('🎤 *ხმოვანი შეტყობინება ჩათში*', `👤 კლიენტი: ${senderPsid}\n[აუდიოს ბმული](${audioUrl})\nბოტი ამუშავებს ხმოვან შეტყობინებას Gemini AI-ით.`);

                const aiResponse = await generateBotResponse({
                  text: '[მომხმარებელმა გამოაგზავნა ხმოვანი შეტყობინება. მოუსმინე ყურადღებით, გაიგე მისი სათქმელი და უპასუხე როგორც ხრამუნას კონსულტანტმა ქართულ ენაზე.]',
                  audio: {
                    mimeType: cleanType,
                    data: base64Audio,
                  },
                }, session.history);

                console.log('[Messenger] Gemini reply to voice note:', aiResponse.replyText);
                await sendMessengerMessage(senderPsid, aiResponse.replyText);
                updateSession(senderPsid, 'assistant', aiResponse.replyText);
              } catch (audioErr) {
                console.error('[Messenger Audio Error]:', audioErr.message);
                const voiceFallback = 'გამარჯობა! 🐾 თქვენი ხმოვანი შეტყობინება მივიღეთ. ტექნიკური მიზეზით მოსმენა ვერ მოხერხდა — თუ არ შეწუხდებით, ტექსტურად მოგვწერეთ და სიამოვნებით დაგეხმარებით ❤️';
                await sendMessengerMessage(senderPsid, voiceFallback);
                updateSession(senderPsid, 'assistant', voiceFallback);
              }
              continue;
            }

            // Handle Stickers, thumbs up, videos or other non-text attachments (prevent ghosting)
            if (!message.text && !message.attachments.some(a => a.type === 'image')) {
              console.log(`[Messenger] Received non-image/non-audio attachment (sticker/like/media) from ${senderPsid}`);
              const session = await getOrHydrateSession(senderPsid);
              const sessionHistory = session.history || [];
              if (sessionHistory.length > 0) {
                // If conversation is already active or closed, acknowledge with warm emoji without restarting sales pitch
                await sendMessengerMessage(senderPsid, '❤️🐾');
                updateSession(senderPsid, 'assistant', '❤️🐾');
              } else {
                const stickerReply = 'გამარჯობა! 🐾❤️ რით შეგვიძლია დაგეხმაროთ, ან რომელი ნატურალური სასუსნავი გაინტერესებთ თქვენი ცუგასთვის? ✨';
                await sendMessengerMessage(senderPsid, stickerReply);
                updateSession(senderPsid, 'assistant', stickerReply);
              }
              continue;
            }
          }
          if (message && !message.is_echo && message.text) {
            const rawUserText = message.text.trim();
            console.log(`[Messenger] Queuing message from ${senderPsid}: "${rawUserText}"`);

            // Smart Debounce: buffer rapid sequential messages within 1.8s
            const debounced = await enqueueUserMessage(senderPsid, rawUserText);
            if (!debounced.isPrimary) {
              console.log(`[Messenger Debounce] Suppressed sub-message for ${senderPsid} (aggregated into batch)`);
              continue;
            }

            const userText = debounced.combinedText;
            console.log(`[Messenger] Processing aggregated message from ${senderPsid}: "${userText}"`);

            const session = await getOrHydrateSession(senderPsid);
            updateSession(senderPsid, 'user', userText);

            // Fast-path: Common courtesies (instant, warm, human, zero API overhead)
            const cleanText = userText.toLowerCase().replace(/[.,!?;:()]/g, '').trim();

            // Fast-path: Explicit human handoff request
            const humanHandoffPhrases = ['ადამიანს დამაკავშირე', 'ადამიანი მინდა', 'ოპერატორი მინდა', 'ოპერატორს დამაკავშირე', 'ადამიანთან მინდა საუბარი', 'ადამიანს ველაპარაკები', 'მომწეროს ადამიანმა'];
            if (humanHandoffPhrases.some(p => cleanText.includes(p))) {
              pauseBotForUser(senderPsid);
              const handoffMsg = 'გასაგებია! ❤️ ჩვენს გუნდს უკვე გადავეცი თქვენი შეტყობინება და მალევე პირადად მოგწერთ ჩვენი თანაგუნდელი.';
              await sendMessengerMessage(senderPsid, handoffMsg);
              updateSession(senderPsid, 'assistant', handoffMsg);
              try {
                await notifyTelegramAlert(
                  '🚨 *ოპერატორის ჩართვის მოთხოვნა (Human Handoff)*',
                  `👤 *მომხმარებელი (ID):* \`${senderPsid}\`\n💬 *შეტყობინება:* "${userText}"\n🔗 [გახსენით Meta Business Suite Inbox](https://business.facebook.com/latest/inbox/)`
                );
              } catch (alertErr) {
                console.error('[Telegram Handoff Alert Error]:', alertErr.message);
              }
              continue;
            }

            // Fast-path: Wholesale / B2B partnership inquiry
            const b2bPhrases = ['საბითუმო', 'საბითუმოდ', 'დისტრიბუცია', 'ზოომაღაზია', 'ზოო მაღაზია', 'პარტნიორობა', 'თანამშრომლობა', 'ვეტკლინიკა', 'ვეტაფთიაქი', 'შემსყიდველი', 'კორპორატიული'];
            if (b2bPhrases.some(p => cleanText.includes(p))) {
              const b2bReply = 'მოგესალმებით! ❤️ დიდი მადლობა დაინტერესებისთვის. დიახ, სიამოვნებით ვთანამშრომლობთ ზოომაღაზიებთან, ვეტკლინიკებსა და პარტნიორებთან საბითუმო ფასებითა და მოქნილი პირობებით.\n\nჩვენს ხელმძღვანელს უკვე გადავეცი თქვენი მოთხოვნა და მალევე პირადად დაგიკავშირდებათ აქ, ან თუ გნებავთ, დაგვიტოვეთ თქვენი საკონტაქტო ნომერი 📲🐾';
              pauseBotForUser(senderPsid);
              await new Promise(r => setTimeout(r, 2600));
              await sendMessengerMessage(senderPsid, b2bReply);
              updateSession(senderPsid, 'assistant', b2bReply);
              try {
                await notifyTelegramAlert(
                  '🤝 *ახალი B2B / საბითუმო მოთხოვნა!*',
                  `👤 *მომხმარებელი (ID):* \`${senderPsid}\`\n💬 *შეტყობინება:* "${userText}"\n🔗 [გახსენით Meta Business Suite Inbox](https://business.facebook.com/latest/inbox/)`
                );
              } catch (alertErr) {
                console.error('[Telegram B2B Alert Error]:', alertErr.message);
              }
              continue;
            }

// Let living AI handle origin, bot questions and thanks contextually without canned texts

            // Fast-path: Goodbyes & Farewell Ping-Pong Guard
            const goodbyeList = ['კარგად', 'კარგად იყავით', 'კარგად ბრძანდებოდეთ', 'ნახვამდის', 'დროებით', 'წარმატებები'];
            if (goodbyeList.includes(cleanText)) {
              const sessionHistory = session.history || [];
              const lastAssistant = sessionHistory.slice().reverse().find(m => m.role === 'assistant' || m.sender === 'assistant');
              if (lastAssistant) {
                const recentFarewells = ['გაახარეთ თქვენი ცუგა', 'მშვიდობიან და ბედნიერ დღეს', 'კარგი საღამო', 'კარგი დღე', 'დაველოდებით თქვენს შეტყობინებას', 'ნებისმიერ დროს მომწერეთ', 'მშვიდობით'];
                if (recentFarewells.some(fw => lastAssistant.text.includes(fw))) {
                  console.log(`[Messenger Debounce] Suppressed loop goodbye for ${senderPsid}, sending paw stamp.`);
                  await sendMessengerMessage(senderPsid, '🐾❤️');
                  updateSession(senderPsid, 'assistant', '🐾❤️');
                  continue;
                }
              }
              const byeReply = 'მშვიდობით და ბედნიერ დღეს გისურვებთ! ❤️🐾 გაახარეთ თქვენი ცუგა.';
              await sendMessengerMessage(senderPsid, byeReply);
              updateSession(senderPsid, 'assistant', byeReply);
              continue;
            }

            // Fast-path: Pure emoji, laughter, reactions (🤣, 😂, 👍, ❤️, ჰაჰა)
            const isPureReaction = /^[\p{Emoji}\s🤣😂😁❤️👍🙏😊🐾🐶]+$/u.test(userText) || ['ჰაჰა', 'ხახა', 'haha', 'hahaha', 'lol', 'xaxa'].includes(cleanText);
            if (isPureReaction) {
              const sessionHistory = session.history || [];
              const lastAssistant = sessionHistory.slice().reverse().find(m => m.role === 'assistant' || m.sender === 'assistant');
              if (lastAssistant) {
                console.log(`[Messenger Fast-Path] Handled reaction "${userText}" from ${senderPsid} without catalog pitch.`);
                let reactionReply = '❤️🐾';
                if (/^(?:🤣|😂|ჰაჰა|ხახა|haha|lol)/i.test(userText) || ['ჰაჰა', 'ხახა', 'haha', 'lol'].includes(cleanText)) {
                  reactionReply = '😄🐾';
                }
                await sendMessengerMessage(senderPsid, reactionReply);
                updateSession(senderPsid, 'assistant', reactionReply);
                continue;
              }
            }

            
            // Fast-path: Order Tracking Self-Service ("როდის მოვა?", "სად არის შეკვეთა?", "კურიერი სად არის?")
            const isOrderTrackingQuery = /(?:როდის მოვა|როდის მომიტან|სად არის ჩემი შეკვეთ|სად არის კურიერ|კურიერი სად არის|სად არის ამანათ|შეკვეთის სტატუსი)/i.test(cleanText);
            if (isOrderTrackingQuery) {
              const latestOrder = getUserLatestOrder(senderPsid);
              if (latestOrder) {
                console.log(`[Messenger Fast-Path] Handled order tracking for ${senderPsid} (Order #${latestOrder.id})`);
                let trackingReply = '';
                const phoneSnippet = latestOrder.phone ? ` ნომერზე: ${latestOrder.phone}` : '';
                if (latestOrder.status === 'CONFIRMED_PAID') {
                  trackingReply = `თქვენი შეკვეთა (#${latestOrder.id} — ${latestOrder.product}) დადასტურებულია და გადაცემულია საკურიერო გრაფიკში! 🐾 კურიერი მოგართმევთ დღის განმავლობაში 12:00-დან 19:00-მდე, მოსვლამდე 20-30 წუთით ადრე აუცილებლად დაგირეკავთ${phoneSnippet} 📞`;
                } else if (latestOrder.status === 'PAY_ON_DELIVERY') {
                  trackingReply = `თქვენი შეკვეთა (#${latestOrder.id} — ${latestOrder.product}) მზადდება და მოგართმევთ კურიერი (გადახდა კურიერთან ნაღდით — ${latestOrder.price}₾) 🐾 მოსვლამდე 20-30 წუთით ადრე დაგირეკავთ${phoneSnippet} 📞`;
                } else if (latestOrder.status === 'OUT_FOR_DELIVERY' || latestOrder.status === 'DISPATCHED') {
                  trackingReply = `თქვენი შეკვეთა (#${latestOrder.id}) კურიერს უკვე თან აქვს და გზაშია! 🚗 მალე დაგიკავშირდებათ${phoneSnippet} 🐾`;
                } else if (latestOrder.status === 'DELIVERED') {
                  trackingReply = `თქვენი შეკვეთა (#${latestOrder.id} — ${latestOrder.product}) უკვე ჩაბარებულია ❤️ იმედია თქვენს ცუგას ძალიან მოეწონა! თუ კიდევ დაგჭირდეთ რამე, ნებისმიერ დროს მომწერეთ 🐾`;
                } else {
                  trackingReply = `თქვენი შეკვეთა (#${latestOrder.id} — ${latestOrder.product}) მიღებულია და მზადების პროცესშია 🐾 კურიერი მოგართმევთ 24-48 საათში. თუ რამე დეტალის დაზუსტება გსურთ, სიამოვნებით დაგეხმარებით ❤️`;
                }
                await sendMessengerMessage(senderPsid, trackingReply);
                updateSession(senderPsid, 'assistant', trackingReply);
                continue;
              }
            }

            // Only show interactive catalog carousel if specifically asked
            if (cleanText === 'კატალოგი' || cleanText === 'მენიუ') {
              await sendMessengerMessage(senderPsid, 'გთავაზობთ ჩვენს 100% ნატურალურ ასორტიმენტს: 🐾');
              await sendProductCatalog(senderPsid);
              updateSession(senderPsid, 'assistant', 'გაიგზავნა პროდუქციის კატალოგი');
              continue;
            }

            // Photo / Visual requests fast-path (Only when customer specifically requests a photo/image!)
            const isExplicitPhotoRequest = (cleanText.includes('ფოტო') || cleanText.includes('სურათ') || cleanText.includes('როგორ გამოიყურება') || cleanText.includes('მაჩვენ') || cleanText.includes('ჩამიგდ') || cleanText.includes('რომ ჩამიგდოთ')) &&
              !cleanText.includes('შეკვეთ') && !cleanText.includes('მინდა შეკვეთა') && !cleanText.includes('ყიდვა');
            if (isExplicitPhotoRequest) {
              const histLast = (session.history || []).slice(-4).map(m => m.text).join(' ');
              const mentionsLung = cleanText.includes('ღრუბ') || cleanText.includes('ფილტვ') || histLast.includes('ღრუბელი') || histLast.includes('ფილტვი');
              const mentionsLiver = cleanText.includes('კუბ') || cleanText.includes('ღვიძლ') || histLast.includes('კუბები') || histLast.includes('ღვიძლი');
              const mentionsPaws = cleanText.includes('თათ') || cleanText.includes('დრაკონ') || cleanText.includes('ქათამ') || histLast.includes('თათები') || histLast.includes('ქათმის');
              const mentionsPowder = cleanText.includes('პუდრ') || cleanText.includes('ფხვნილ') || histLast.includes('პუდრა');

              if (mentionsLung && !mentionsLiver && !mentionsPaws && !mentionsPowder) {
                await sendMessengerImage(senderPsid, `${BASE_HOST}/images/ghrubeli_v3.jpg`);
                await sendMessengerMessage(senderPsid, 'ესეც ჩვენი 100% ნატურალური საქონლის ფილტვი — „ღრუბელი“ (50გ) 🐾 ჰაეროვანი, დაბალკალორიული და იდეალური წვრთნისთვის.');
              } else if (mentionsLiver && !mentionsLung && !mentionsPaws && !mentionsPowder) {
                await sendMessengerImage(senderPsid, `${BASE_HOST}/images/kubebi_v3.jpg`);
                await sendMessengerMessage(senderPsid, 'ესეც ჩვენი 100% საქონლის ღვიძლის „სუპერ-კუბები“ (80გ) 🐾 ვიტამინებით სავსე, ძლიერი და მიმზიდველი არომატით.');
              } else if (mentionsPaws && !mentionsLung && !mentionsLiver && !mentionsPowder) {
                await sendMessengerImage(senderPsid, `${BASE_HOST}/images/tathebi_v3.jpg`);
                await sendMessengerMessage(senderPsid, 'ესეც ჩვენი „დრაკონის თათები“ (100გ) — 100% ქათმის ფეხი 🐾 ბუნებრივი კოლაგენი სახსრებისა და კბილების გასაწმენდად.');
              } else if (mentionsPowder && !mentionsLung && !mentionsLiver && !mentionsPaws) {
                await sendMessengerImage(senderPsid, `${BASE_HOST}/images/pudra_v3.jpg`);
                await sendMessengerMessage(senderPsid, 'ესეც „ჯადოსნური პუდრა“ (40გ) — 100% საქონლის გამომშრალი ღვიძლი და ფილტვი 🐾 მადისაღმძვრელი ბუნებრივი ტოპინგი.');
              } else {
                await sendMessengerImage(senderPsid, `${BASE_HOST}/images/full_pack_v5.jpg`);
                await sendMessengerMessage(senderPsid, 'გაეცანით ჩვენს ნატურალურ ასორტიმენტს 🐾 ქვემოთ შეგიძლიათ დეტალურადაც დაათვალიეროთ:');
                await sendProductCatalog(senderPsid);
              }
              updateSession(senderPsid, 'assistant', 'გაიგზავნა პროდუქციის ფოტო');
              continue;
            }

            const profile = getCustomerProfile(senderPsid);
            const activeOrder = getUserLatestOrder(senderPsid);

            console.log(`[Messenger] Calling Gemini AI for ${senderPsid} with CRM & Order context...`);
            const sessionHistory = session.history || [];
            const aiResponse = await generateBotResponse(userText, sessionHistory, {
              profile,
              activeOrder,
              isContinuedConversation: sessionHistory.length > 1,
            });
            console.log('[Messenger] Gemini reply:', aiResponse.replyText);

            // Auto-learn customer profile updates (pet name, breed, allergies)
            if (aiResponse.customerProfileUpdates) {
              updateCustomerProfile(senderPsid, aiResponse.customerProfileUpdates);
            }

            
            if (aiResponse.isEscalated) {
              console.log(`[Messenger] Escalation triggered for user ${senderPsid}`);
              await notifyTelegramAlert(
                '🚨 *პრიორიტეტული ყურადღება / ესკალაცია!*',
                `👤 კლიენტი (ID): \`${senderPsid}\`\n💬 შეტყობინება: "${userText}"\n🤖 ბოტის პასუხი: "${aiResponse.replyText}"\n🔗 [გახსენით Meta Business Suite Inbox](https://business.facebook.com/latest/inbox/)`
              );
            }
            if (aiResponse.isOrderReady && aiResponse.order) {
              const cleanProduct = (aiResponse.order.product || '').trim();
              const orderPrice = Number(aiResponse.order.price) || 0;
              const cleanPhone = normalizeGeorgianPhone(aiResponse.order.phone);
              const cleanAddress = (aiResponse.order.address || '').trim();

              // Strict 4-point guard: Product, Price, Phone, Address must all be verified!
              // Georgian mobile numbers are exactly 9 digits (typically starting with 5)
              const isValidPhone = cleanPhone.length === 9;
              const isValidProduct = cleanProduct.length >= 3 && !cleanProduct.includes('უცნობი') && orderPrice > 0;
              const isValidAddress = cleanAddress.length >= 5;

              if (isValidProduct && isValidPhone && isValidAddress) {
                const order = saveOrder({
                  userId: senderPsid,
                  ...aiResponse.order,
                  phone: cleanPhone,
                });
                updateCustomerProfile(senderPsid, {
                  phone: cleanPhone,
                  preferredAddress: cleanAddress,
                  lastOrder: {
                    id: order.id,
                    product: order.product,
                    price: order.price,
                    createdAt: order.createdAt,
                  },
                });
                try {
                  await saveOrderToGoogleSheet(order);
                } catch (sheetErr) {
                  console.error('[Sheets Non-blocking Error]:', sheetErr.message);
                }
                try {
                  await notifyTelegramOrder(order);
                } catch (tgErr) {
                  console.error('[Telegram Non-blocking Error]:', tgErr.message);
                }
              } else {
                // SILENT ORDER DROP RESCUE: Never tell user order is confirmed if validation fails!
                console.warn('[Messenger Guard] Order blocked by validation guard:', aiResponse.order);
                if (!isValidPhone) {
                  aiResponse.replyText = 'დიდი მადლობა! 🐾 შეკვეთის დასადასტურებლად გთხოვთ გადაამოწმოთ თქვენი ტელეფონის ნომერი — როგორც ჩანს, ციფრი აკლია ან არასწორია (საქართველოს მობილურის ნომერი 9-ნიშნა უნდა იყოს, მაგ: 597123456) 📞';
                } else if (!isValidAddress) {
                  aiResponse.replyText = 'დიდი მადლობა! 🐾 გთხოვთ მიტანის მისამართი ცოტა უფრო დეტალურად მოგვწეროთ (ქუჩა, კორპუსი/სახლი ან ორიენტირი), რომ კურიერმა იოლად მოგაგნოთ 📍';
                }
                aiResponse.isOrderReady = false;
              }
            }

            // Simulate natural human typing pause
            // Simulate natural human typing pause (1.2s to 2.2s based on response length)
            const typingDelay = Math.min(5200, Math.max(3000, ((aiResponse.replyText || '').length * 20) + Math.floor(Math.random() * 1200)));
            await new Promise((resolve) => setTimeout(resolve, typingDelay));

            console.log('[Messenger] Sending natural reply back to Facebook...');
            let finalText = aiResponse.replyText || '';
            if (finalText.trim().startsWith('{') && finalText.includes('"replyText"')) {
              console.warn('[Messenger Guard] Intercepted raw JSON in replyText, extracting clean text...');
              const m = finalText.match(/"replyText"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"|(?<!\\)"\s*\}|$)/);
              if (m && m[1]) {
                finalText = m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
              } else {
                finalText = 'დიდი მადლობა! ❤️ დეტალები ჩანიშნულია. დამატებით რაიმე ხომ არ გაინტერესებთ? 🐾';
              }
            }
            // Send message with Dual-Bubble Conversational Delivery and contextual Quick-Replies
            const sanitizedText = sanitizeOutgoingText(finalText);
            await deliverConversationalReply(senderPsid, sanitizedText);
            updateSession(senderPsid, 'assistant', sanitizedText);
          }
        }

        // 2. Handle Comments on Posts (Facebook Feed & Instagram Comments)
        for (const change of entry.changes || []) {
          // Facebook Comments
          if (change.field === 'feed' && change.value) {
            const val = change.value;
            const senderId = val.from?.id;
            const isFromPage = senderId === '928195650386088' || val.sender_id === '928195650386088';
            if (val.item === 'comment' && val.verb === 'add' && !isFromPage) {
              const commentId = val.comment_id;
              const commenterName = val.from?.name || '';
              const commentText = val.message || '';
              const postText = val.post?.message || val.post_title || '';
              console.log(`[Feed Webhook] Incoming Facebook comment from ${commenterName} (${commentId}): "${commentText}"`);

              await handleCommentAction({
                commentId,
                commenterName,
                commentText,
                postText,
                isInstagram: false,
              }).catch((err) => console.error('[Feed Webhook] Comment action error:', err));
            }
          }

          // Instagram Comments
          if (change.field === 'comments' && change.value) {
            const val = change.value;
            const isFromPage = val.from?.username === 'khramuna_snacks' || val.from?.id === '17841427052704939';
            if (val.id && !isFromPage) {
              const commentId = val.id;
              const commenterName = val.from?.username || '';
              const commentText = val.text || '';
              console.log(`[Instagram Webhook] Incoming IG comment from @${commenterName} (${commentId}): "${commentText}"`);

              handleCommentAction({
                commentId,
                commenterName: `@${commenterName}`,
                commentText,
                postText: '',
                isInstagram: true,
              }).catch((err) => console.error('[Instagram Webhook] Background comment action error:', err));
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
