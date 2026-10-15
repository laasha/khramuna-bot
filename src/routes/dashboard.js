import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getOrders,
  updateOrderStatus,
  getCustomerProfile,
  pauseBotForUser,
  isBotPausedForUser,
  unpauseBotForUser,
  isCommentReplied,
  markCommentReplied
} from '../services/storage.js';
import { sendMessengerMessage, replyToComment } from '../services/facebook.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const PAGE_ID = process.env.FB_PAGE_ID || '928195650386088';
const STOCK_FILE = path.resolve(__dirname, '../config/stock.json');
const PROFILES_FILE = process.env.VERCEL
  ? '/tmp/khramuna-data/profiles.json'
  : path.resolve(__dirname, '../../data/profiles.json');
const SEED_PROFILES_FILE = path.resolve(__dirname, '../../data/profiles.json');

function getProfilesMap() {
  if (fs.existsSync(PROFILES_FILE)) {
    try {
      const d = JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf8'));
      if (Object.keys(d).length > 0) return d;
    } catch(e) {}
  }
  if (fs.existsSync(SEED_PROFILES_FILE)) {
    try {
      const d = JSON.parse(fs.readFileSync(SEED_PROFILES_FILE, 'utf8'));
      try {
        if (!fs.existsSync(path.dirname(PROFILES_FILE))) fs.mkdirSync(path.dirname(PROFILES_FILE), { recursive: true });
        fs.writeFileSync(PROFILES_FILE, JSON.stringify(d, null, 2), 'utf8');
      } catch(e) {}
      return d;
    } catch(e) {}
  }
  return {};
}

const ADMIN_PIN = process.env.ADMIN_DASHBOARD_PIN || process.env.ADMIN_PIN || 'khramuna2026';

// Simple Auth Middleware
function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const pinHeader = req.headers['x-admin-pin'] || '';

  if (token === ADMIN_PIN || pinHeader === ADMIN_PIN || req.query.pin === ADMIN_PIN) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized: Invalid Admin PIN' });
}

// 1. PIN Login Check
router.post('/login', (req, res) => {
  const { pin } = req.body || {};
  if (pin === ADMIN_PIN) {
    return res.json({ success: true, token: ADMIN_PIN });
  }
  return res.status(401).json({ success: false, error: 'არასწორი PIN კოდი' });
});

// All subsequent routes require auth
router.use(requireAdminAuth);

// 2. Overview / Stats
router.get('/stats', async (req, res) => {
  try {
    const orders = getOrders();
    const totalOrders = orders.length;
    const paidOrders = orders.filter(o => o.status === 'CONFIRMED_PAID' || o.status === 'PAID');
    const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);

    const profilesMap = getProfilesMap();
    const profilesCount = Object.keys(profilesMap).length;

    let stockData = {};
    try {
      if (fs.existsSync(STOCK_FILE)) {
        stockData = JSON.parse(fs.readFileSync(STOCK_FILE, 'utf8'));
      }
    } catch (e) {}

    res.json({
      success: true,
      stats: {
        totalOrders,
        paidOrdersCount: paidOrders.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        profilesCount,
        stockSummary: stockData,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Orders List & Management
router.get('/orders', (req, res) => {
  try {
    const orders = getOrders();
    res.json({ success: true, orders: orders.slice().reverse() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/orders/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body || {};
  if (!status) return res.status(400).json({ error: 'Status is required' });

  const updated = updateOrderStatus(id, status, notes || '');
  if (!updated) return res.status(404).json({ error: 'Order not found' });

  res.json({ success: true, order: updated });
});

// 4. Live Messenger Chats
router.get('/chats', async (req, res) => {
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ error: 'No FB_PAGE_ACCESS_TOKEN configured' });

  try {
    const url = `https://graph.facebook.com/v19.0/${PAGE_ID}/conversations?fields=id,updated_time,unread_count,senders,snippet&limit=25&access_token=${token}`;
    const fbRes = await fetch(url);
    const fbData = await fbRes.json();

    const chats = (fbData.data || []).map(c => {
      const customer = c.senders?.data?.find(s => s.id !== PAGE_ID) || {};
      const isPaused = isBotPausedForUser(customer.id);
      
      const snippetLower = (c.snippet || '').toLowerCase();
      const needsHumanAttention = isPaused ||
        snippetLower.includes('ოპერატორ') ||
        snippetLower.includes('ვერ ვრიცხავ') ||
        snippetLower.includes('არ მიშვებს') ||
        snippetLower.includes('პირადი') ||
        snippetLower.includes('რეკვიზიტ');

      return {
        convId: c.id,
        userId: customer.id,
        userName: customer.name || 'მომხმარებელი',
        updatedTime: c.updated_time,
        unreadCount: c.unread_count || 0,
        snippet: c.snippet || '',
        isBotPaused: isPaused,
        needsHumanAttention
      };
    });

    res.json({ success: true, chats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Single Chat Message History
router.get('/chats/:convId/messages', async (req, res) => {
  const { convId } = req.params;
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ error: 'No token' });

  try {
    const url = `https://graph.facebook.com/v19.0/${convId}/messages?fields=id,message,from,created_time,attachments&limit=30&access_token=${token}`;
    const r = await fetch(url);
    const data = await r.json();

    const messages = (data.data || []).reverse().map(m => ({
      id: m.id,
      text: m.message,
      isPage: m.from?.id === PAGE_ID,
      fromName: m.from?.name || (m.from?.id === PAGE_ID ? 'ხრამუნა' : 'კლიენტი'),
      time: m.created_time,
      attachments: m.attachments?.data || []
    }));

    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Toggle Bot Pause / Takeover for a specific user
router.post('/chats/:userId/toggle-bot', (req, res) => {
  const { userId } = req.params;
  const { pause, durationMinutes } = req.body || {};

  if (pause) {
    pauseBotForUser(userId, durationMinutes || 120);
    res.json({ success: true, isBotPaused: true, message: `ბოტი შეჩერებულია ${durationMinutes || 120} წუთით` });
  } else {
    unpauseBotForUser(userId);
    res.json({ success: true, isBotPaused: false, message: 'ბოტის ავტომატიზაცია გააქტიურებულია' });
  }
});

// 6. Direct Admin Reply from Dashboard
router.post('/chats/:userId/reply', async (req, res) => {
  const { userId } = req.params;
  const { text } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ error: 'Text message is required' });

  try {
    // Send message via Facebook Messenger API
    const sent = await sendMessengerMessage(userId, text.trim());
    if (sent) {
      // Pause bot for 60 mins so AI doesn't clash with founder's active conversation
      pauseBotForUser(userId, 60);
      return res.json({ success: true, message: 'შეტყობინება წარმატებით გაიგზავნა' });
    } else {
      return res.status(500).json({ success: false, error: 'Facebook API-მ ვერ გააგზავნა შეტყობინება' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Recent Facebook & Instagram Comments
router.get('/comments', async (req, res) => {
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ error: 'No token' });

  const allComments = [];

  // Facebook Page Comments
  try {
    const url = `https://graph.facebook.com/v19.0/${PAGE_ID}/posts?fields=id,message,created_time,comments{id,message,from,created_time,comments{id,message,from,created_time}}&limit=6&access_token=${token}`;
    const fbRes = await fetch(url);
    const fbData = await fbRes.json();

    for (const post of fbData.data || []) {
      for (const c of post.comments?.data || []) {
        if (!c.id) continue;
        const subReplies = c.comments?.data || [];
        const pageReplied = subReplies.some(sc => sc.from?.id === PAGE_ID);

        allComments.push({
          id: c.id,
          platform: 'Facebook',
          postMessage: (post.message || '').substring(0, 80) + '...',
          postId: post.id,
          commenterName: c.from?.name || 'მომხმარებელი',
          text: c.message || '',
          createdTime: c.created_time,
          isReplied: isCommentReplied(c.id) || pageReplied,
          replies: subReplies.map(sr => ({
            id: sr.id,
            from: sr.from?.name || (sr.from?.id === PAGE_ID ? 'ხრამუნა' : 'კლიენტი'),
            isPage: sr.from?.id === PAGE_ID,
            text: sr.message,
            time: sr.created_time
          }))
        });
      }
    }
  } catch (err) {
    console.error('[Dashboard Comments Error]:', err.message);
  }

  // Instagram Media Comments
  try {
    const igAccRes = await fetch(`https://graph.facebook.com/v19.0/${PAGE_ID}?fields=instagram_business_account&access_token=${token}`);
    const igAccJson = await igAccRes.json();
    const igId = igAccJson.instagram_business_account?.id;
    if (igId) {
      const igMediaUrl = `https://graph.facebook.com/v19.0/${igId}/media?fields=id,caption,comments{id,text,username,timestamp,replies{id,text,username,timestamp}}&limit=4&access_token=${token}`;
      const igRes = await fetch(igMediaUrl);
      const igJson = await igRes.json();

      for (const m of igJson.data || []) {
        for (const ic of m.comments?.data || []) {
          allComments.push({
            id: ic.id,
            platform: 'Instagram',
            postMessage: (m.caption || '').substring(0, 80) + '...',
            postId: m.id,
            commenterName: `@${ic.username || 'user'}`,
            text: ic.text || '',
            createdTime: ic.timestamp,
            isReplied: isCommentReplied(ic.id),
            replies: (ic.replies?.data || []).map(ir => ({
              id: ir.id,
              from: `@${ir.username}`,
              isPage: ir.username === 'khramuna',
              text: ir.text,
              time: ir.timestamp
            }))
          });
        }
      }
    }
  } catch (e) {}

  res.json({ success: true, comments: allComments });
});

// Reply to a comment from Dashboard
router.post('/comments/:commentId/reply', async (req, res) => {
  const { commentId } = req.params;
  const { text, isInstagram } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ error: 'Reply text is required' });

  try {
    const success = await replyToComment(commentId, text.trim(), !!isInstagram);
    if (success) {
      markCommentReplied(commentId);
      res.json({ success: true, message: 'კომენტარზე პასუხი წარმატებით გამოქვეყნდა!' });
    } else {
      res.status(500).json({ success: false, error: 'Facebook/Instagram API-მ პასუხი ვერ გააგზავნა' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Pet CRM Profiles
router.get('/profiles', (req, res) => {
  try {
    const profiles = getProfilesMap();
    const profileList = Object.values(profiles).map(p => ({
      userId: p.userId,
      customerName: p.customerName || 'მომხმარებელი',
      petName: p.petName || 'საყვარელი ცუგა',
      petType: p.petType || 'ძაღლი',
      petBreed: p.petBreed || 'უცნობი',
      allergies: p.allergies || 'არ არის დაფიქსირებული',
      phone: p.phone || '',
      address: p.preferredAddress || '',
      lastOrder: p.lastOrder || null,
      totalOrders: p.totalOrders || (p.lastOrder ? 1 : 0),
      updatedAt: p.updatedAt || p.createdAt || ''
    }));

    res.json({ success: true, profiles: profileList });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Live Stock Config
router.get('/stock', (req, res) => {
  try {
    const stock = JSON.parse(fs.readFileSync(STOCK_FILE, 'utf8'));
    res.json({ success: true, stock });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/stock', (req, res) => {
  try {
    const { key, inStock, quantity } = req.body || {};
    const stock = JSON.parse(fs.readFileSync(STOCK_FILE, 'utf8'));

    if (key && stock[key]) {
      if (typeof inStock === 'boolean') stock[key].inStock = inStock;
      if (typeof quantity === 'number') stock[key].quantity = quantity;
      fs.writeFileSync(STOCK_FILE, JSON.stringify(stock, null, 2), 'utf8');
      return res.json({ success: true, stock });
    }
    res.status(400).json({ error: 'Invalid product key' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
