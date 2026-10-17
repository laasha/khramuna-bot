import { SEED_ORDERS } from '../data/seedOrders.js';
import { SEED_PROFILES } from '../data/seedProfiles.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = process.env.VERCEL ? '/tmp/khramuna-data' : path.resolve(__dirname, '../../data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJsonFile(filePath, defaultValue) {
  try {
    const baseName = path.basename(filePath);
    const seedFile = path.resolve(__dirname, '../../data', baseName);

    if (!fs.existsSync(filePath)) {
      if (fs.existsSync(seedFile)) {
        try {
          const seedContent = fs.readFileSync(seedFile, 'utf8');
          fs.writeFileSync(filePath, seedContent, 'utf8');
          return JSON.parse(seedContent);
        } catch (e) {}
      }
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
      return defaultValue;
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);

    // If current file in /tmp is empty, fallback to seeded data
    if ((Array.isArray(parsed) && parsed.length === 0) || (typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length === 0)) {
      if (fs.existsSync(seedFile)) {
        try {
          const seedRaw = fs.readFileSync(seedFile, 'utf8');
          const seedParsed = JSON.parse(seedRaw);
          if ((Array.isArray(seedParsed) && seedParsed.length > 0) || (typeof seedParsed === 'object' && Object.keys(seedParsed).length > 0)) {
            fs.writeFileSync(filePath, seedRaw, 'utf8');
            return seedParsed;
          }
        } catch (e) {}
      }
    }

    return parsed;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return defaultValue;
  }
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error.message);
  }
}

const DESKTOP_DIR = 'C:\\Users\\Lenovo Yoga\\Desktop';
const DESKTOP_CSV_FILE = path.join(DESKTOP_DIR, 'ხრამუნას_შეკვეთები.csv');
const LOCAL_CSV_FILE = path.join(DATA_DIR, 'orders.csv');

/**
 * Syncs all orders to a Desktop CSV file (formatted for Microsoft Excel & Google Sheets).
 */
export function syncOrdersToCsv() {
  const orders = getOrders();
  const headers = ['შეკვეთის ID', 'თარიღი', 'პროდუქტი', 'თანხა (₾)', 'მისამართი', 'ტელეფონის ნომერი', 'სტატუსი'];

  const rows = orders.map((o) => {
    const dateStr = new Date(o.createdAt).toLocaleString('ka-GE', { timeZone: 'Asia/Tbilisi' });
    const product = `"${(o.product || '').replace(/"/g, '""')}"`;
    const price = o.price || '';
    const address = `"${(o.address || '').replace(/"/g, '""')}"`;
    const phone = `"${(o.phone || '').replace(/"/g, '""')}"`;
    const status = o.status || 'PENDING';
    return [o.id, `"${dateStr}"`, product, price, address, phone, status].join(',');
  });

  // \uFEFF (UTF-8 BOM) guarantees Excel displays Georgian letters correctly
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');

  try {
    if (fs.existsSync(DESKTOP_DIR)) {
      fs.writeFileSync(DESKTOP_CSV_FILE, csvContent, 'utf8');
    }
    fs.writeFileSync(LOCAL_CSV_FILE, csvContent, 'utf8');
  } catch (err) {
    console.error('[Storage] Error syncing to Desktop CSV:', err.message);
  }
}

/**
 * Saves a new order to the database and syncs to Desktop CSV.
 */
export function saveOrder(orderData) {
  const orders = readJsonFile(ORDERS_FILE, []);
  const isCash = (orderData.paymentMethod || '').toLowerCase().includes('ნაღდ') || (orderData.paymentMethod || '').toLowerCase() === 'cash';
  const isPaid = orderData.status === 'CONFIRMED_PAID';
  const initialStatus = isPaid
    ? 'CONFIRMED_PAID'
    : (isCash ? 'PAY_ON_DELIVERY' : 'AWAITING_PAYMENT');

  const newOrder = {
    id: `KHR-${Date.now().toString().slice(-6)}`,
    createdAt: new Date().toISOString(),
    status: initialStatus,
    ...orderData,
    status: initialStatus, // strict guard: avoid premature CONFIRMED
  };
  orders.push(newOrder);
  writeJsonFile(ORDERS_FILE, orders);
  syncOrdersToCsv();
  return newOrder;
}

/**
 * Retrieves all orders.
 */
export function getOrders() {
  const list = readJsonFile(ORDERS_FILE, []);
  if (Array.isArray(list) && list.length > 0) return list;
  return SEED_ORDERS || [];
}

// Initial sync on startup
syncOrdersToCsv();

/**
 * Retrieves or initializes customer chat session history.
 */
// In-memory cache for fast, seamless context persistence across warm serverless requests
const memorySessions = new Map();

/**
 * Hydrates conversation history directly from Meta Graph API for zero-cost long-term memory.
 * Overcomes Vercel serverless cold starts and recovers context across days of silence.
 */
export async function hydrateSessionFromMeta(userId, platform = null) {
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  const pageId = process.env.FB_PAGE_ID || '928195650386088';
  const igAccountId = process.env.IG_ACCOUNT_ID || '17841427052704939';
  if (!token || !userId) return { history: [], lastActivity: Date.now() };

  try {
    let rawMessages = null;
    const isInstagram = platform === 'instagram' || String(userId).length >= 16;

    // 1. Primary hydration request
    const url1 = isInstagram
      ? `https://graph.facebook.com/v20.0/${pageId}/conversations?platform=instagram&user_id=${userId}&fields=id,messages.limit(15){message,from,created_time}&access_token=${token}`
      : `https://graph.facebook.com/v20.0/${pageId}/conversations?user_id=${userId}&fields=id,messages.limit(15){message,from,created_time}&access_token=${token}`;

    let res = await fetch(url1);
    let json = res.ok ? await res.json() : null;
    rawMessages = json?.data?.[0]?.messages?.data;

    // 2. Fallback to alternative platform if empty
    if ((!Array.isArray(rawMessages) || rawMessages.length === 0) && !isInstagram) {
      const url2 = `https://graph.facebook.com/v20.0/${pageId}/conversations?platform=instagram&user_id=${userId}&fields=id,messages.limit(15){message,from,created_time}&access_token=${token}`;
      res = await fetch(url2);
      json = res.ok ? await res.json() : null;
      rawMessages = json?.data?.[0]?.messages?.data;
    }

    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      return { history: [], lastActivity: Date.now() };
    }

    // Meta returns messages newest first; reverse for chronological order
    const history = rawMessages
      .slice()
      .reverse()
      .map((m) => {
        const senderId = m.from?.id;
        const senderUsername = m.from?.username;
        const isAssistant = senderId === pageId || senderId === igAccountId || senderUsername === 'khramuna_snacks';
        const text = m.message ? m.message.trim() : '[მედია/სურათი]';
        return {
          role: isAssistant ? 'assistant' : 'user',
          text,
          timestamp: m.created_time,
        };
      })
      .filter((m) => m.text.length > 0);

    const session = {
      history,
      lastActivity: Date.now(),
      hydratedFromMeta: true,
    };
    memorySessions.set(userId, session);

    try {
      const sessions = readJsonFile(SESSIONS_FILE, {});
      sessions[userId] = session;
      writeJsonFile(SESSIONS_FILE, sessions);
    } catch (e) {}

    console.log(`[Storage] Successfully hydrated ${history.length} messages from Meta for user ${userId}`);
    return session;
  } catch (err) {
    console.error(`[Storage] Failed to hydrate session from Meta for ${userId}:`, err.message);
    return { history: [], lastActivity: Date.now() };
  }
}

/**
 * Retrieves customer session, actively hydrating from Meta if local cache is cold/empty.
 */
export async function getOrHydrateSession(userId, platform = null) {
  if (memorySessions.has(userId)) {
    const s = memorySessions.get(userId);
    if (s.history && s.history.length > 0) return s;
  }
  const sessions = readJsonFile(SESSIONS_FILE, {});
  if (sessions[userId] && sessions[userId].history && sessions[userId].history.length > 0) {
    memorySessions.set(userId, sessions[userId]);
    return sessions[userId];
  }

  // Cold start on Vercel serverless -> Hydrate from Meta Graph API
  const hydrated = await hydrateSessionFromMeta(userId, platform);
  return hydrated;
}

export function getSession(userId) {
  if (memorySessions.has(userId)) {
    return memorySessions.get(userId);
  }
  const sessions = readJsonFile(SESSIONS_FILE, {});
  const session = sessions[userId] || { history: [], lastActivity: Date.now() };
  memorySessions.set(userId, session);
  return session;
}

/**
 * Appends messages to customer session history.
 */
export function updateSession(userId, role, text) {
  const session = getSession(userId);
  session.history.push({
    role,
    text,
    timestamp: new Date().toISOString(),
  });
  // Keep last 30 messages for rich multi-day conversation depth
  if (session.history.length > 30) {
    session.history = session.history.slice(-30);
  }
  session.lastActivity = Date.now();
  memorySessions.set(userId, session);

  try {
    const sessions = readJsonFile(SESSIONS_FILE, {});
    sessions[userId] = session;
    writeJsonFile(SESSIONS_FILE, sessions);
  } catch (err) {
    console.error('[Storage Error] Failed to persist session to disk:', err.message);
  }
}


/**
 * Retrieves all stored conversation sessions across memory and disk.
 */
export function getAllSessions() {
  const sessions = readJsonFile(SESSIONS_FILE, {});
  for (const [id, mem] of memorySessions.entries()) {
    if (!sessions[id]) {
      sessions[id] = mem;
    } else if (mem.lastActivity > (sessions[id].lastActivity || 0)) {
      sessions[id] = mem;
    }
  }
  return sessions;
}

/**
 * Persists updated sessions map to disk and memory.
 */
export function saveSessions(sessions) {
  if (!sessions || typeof sessions !== 'object') return;
  for (const [id, sess] of Object.entries(sessions)) {
    memorySessions.set(id, sess);
  }
  try {
    writeJsonFile(SESSIONS_FILE, sessions);
  } catch (err) {
    console.error('[Storage] Error saving sessions:', err.message);
  }
}

const REPLIED_COMMENTS_FILE = path.join(DATA_DIR, 'replied_comments.json');

/**
 * Checks if a Facebook comment has already been replied to.
 */
export function isCommentReplied(commentId) {
  const list = readJsonFile(REPLIED_COMMENTS_FILE, []);
  return list.includes(commentId);
}

/**
 * Marks a Facebook comment as replied.
 */
export function markCommentReplied(commentId) {
  const list = readJsonFile(REPLIED_COMMENTS_FILE, []);
  if (!list.includes(commentId)) {
    list.push(commentId);
    writeJsonFile(REPLIED_COMMENTS_FILE, list);
  }
}

const FEED_REPLIES_FILE = path.join(DATA_DIR, 'feed_replies.json');

/**
 * Retrieves recent public feed replies for AI anti-repetition context.
 */
export function getRecentFeedReplies(limit = 8) {
  const list = readJsonFile(FEED_REPLIES_FILE, []);
  return list.slice(-limit);
}

/**
 * Saves a new feed reply to history.
 */
export function saveFeedReply(text) {
  if (!text || typeof text !== 'string') return;
  const list = readJsonFile(FEED_REPLIES_FILE, []);
  list.push(text.trim());
  // Keep last 30 replies
  const trimmed = list.slice(-30);
  writeJsonFile(FEED_REPLIES_FILE, trimmed);
}

const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');

/**
 * Retrieves the customer's permanent CRM profile (pet name, breed, allergies, history).
 */
export function getCustomerProfile(userId) {
  if (!userId) return null;
  const profiles = readJsonFile(PROFILES_FILE, {});
  if (profiles && profiles[userId]) return profiles[userId];
  if (SEED_PROFILES && SEED_PROFILES[userId]) return SEED_PROFILES[userId];
  return null;
}

/**
 * Updates or merges new fields into customer CRM profile.
 */
export function updateCustomerProfile(userId, newFields) {
  if (!userId || !newFields || typeof newFields !== 'object') return null;
  const profiles = readJsonFile(PROFILES_FILE, {});
  const existing = profiles[userId] || {
    userId,
    createdAt: new Date().toISOString(),
  };

  const updated = {
    ...existing,
    updatedAt: new Date().toISOString(),
  };

  if (newFields.petName && typeof newFields.petName === 'string') {
    const rawPet = newFields.petName.trim();
    const invalidPets = /^(?:ალერგიული|ორწლინახევრის|ბიგლის|რას|ცუგასთვის|ძაღლისთვის|საყვარელი ცუგა|ლეკვის|ლეკვი|ძაღლი|ცუგა|პატარა|დიდი|ფისო|კი|არა|ჰო|მინდა|უცნობი)$/i;
    if (rawPet.length >= 2 && !invalidPets.test(rawPet) && !rawPet.endsWith('ისთვის') && !rawPet.endsWith('სთვის')) {
      updated.petName = rawPet;
    }
  }
  if (newFields.petType && typeof newFields.petType === 'string' && newFields.petType.trim()) {
    updated.petType = newFields.petType.trim();
  }
  if (newFields.petBreed && typeof newFields.petBreed === 'string' && newFields.petBreed.trim() && newFields.petBreed !== 'უცნობი') {
    updated.petBreed = newFields.petBreed.trim();
  }
  if (newFields.petAge && typeof newFields.petAge === 'string' && newFields.petAge.trim()) {
    updated.petAge = newFields.petAge.trim();
  }
  if (newFields.allergies && typeof newFields.allergies === 'string' && newFields.allergies.trim()) {
    updated.allergies = newFields.allergies.trim();
  }
  if (newFields.preferredAddress && typeof newFields.preferredAddress === 'string') {
    const rawAddr = newFields.preferredAddress.trim();
    const invalidAddrRegex = /(?:ჩავრიცხავ|საქ.?ბანკ|თიბისი|ანგარიშ|გაქვთ|ფილიალ|მაღაზია|მითხარით|წავიღებ|წავიღეფ|არ მინდა)/i;
    if (rawAddr.length >= 6 && !invalidAddrRegex.test(rawAddr)) {
      updated.preferredAddress = rawAddr;
    }
  }
  if (newFields.phone && typeof newFields.phone === 'string') {
    let cleanPhone = String(newFields.phone).replace(/[^\d]/g, '');
    if (cleanPhone.startsWith('995') && cleanPhone.length >= 12) cleanPhone = cleanPhone.slice(3);
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.replace(/^0+/, '');
    if (cleanPhone.length === 9 && cleanPhone.startsWith('5') && cleanPhone !== '587854473') {
      updated.phone = cleanPhone;
    }
  }
  if (newFields.lastOrder) {
    updated.lastOrder = newFields.lastOrder;
    updated.totalOrders = (updated.totalOrders || 0) + 1;
  }

  profiles[userId] = updated;
  writeJsonFile(PROFILES_FILE, profiles);
  console.log(`[Storage] Updated permanent customer profile for ${userId}:`, JSON.stringify(updated));
  return updated;
}

/**
 * Retrieves customer's latest order from storage.
 */
export function getUserLatestOrder(userId) {
  if (!userId) return null;
  const orders = getOrders();
  const userOrders = orders.filter((o) => o.userId === userId);
  if (userOrders.length === 0) return null;
  return userOrders[userOrders.length - 1];
}

/**
 * Updates order status (e.g. from PENDING to PAID / VERIFIED).
 */
export function updateOrderStatus(orderId, status, extraNotes = '') {
  const orders = readJsonFile(ORDERS_FILE, []);
  const order = orders.find((o) => o.id === orderId);
  if (order) {
    order.status = status;
    if (status === 'DELIVERED' && !order.deliveredAt) {
      order.deliveredAt = new Date().toISOString();
    }
    if (extraNotes) {
      order.verificationNotes = extraNotes;
    }
    order.updatedAt = new Date().toISOString();
    writeJsonFile(ORDERS_FILE, orders);
    syncOrdersToCsv();
    return order;
  }
  return null;
}

// Human admin live takeover: userId -> timestamp (ms) until which bot is paused
const humanPauses = new Map();

/**
 * Pauses the bot for a specific user when a human admin replies manually.
 */
export function pauseBotForUser(userId, durationMinutes = 60) {
  if (!userId) return;
  const until = Date.now() + durationMinutes * 60 * 1000;
  humanPauses.set(userId, until);
  console.log(`[Storage] Bot paused for user ${userId} until ${new Date(until).toISOString()} (human admin active)`);
}

/**
 * Checks if the bot is currently paused for a user due to human intervention.
 */
export function isBotPausedForUser(userId) {
  if (!userId) return false;
  const until = humanPauses.get(userId);
  if (!until) return false;
  if (Date.now() > until) {
    humanPauses.delete(userId);
    return false;
  }
  return true;
}

/**
 * Unpauses bot manually if needed.
 */
export function unpauseBotForUser(userId) {
  if (userId) humanPauses.delete(userId);
}

/**
 * Updates full order details (customerName, phone, address, product, price, status, deliveryNotes, etc.)
 */
export function updateOrder(orderId, updateFields = {}) {
  const orders = readJsonFile(ORDERS_FILE, []);
  const order = orders.find((o) => o.id === orderId);
  if (!order) return null;

  if (updateFields.customerName !== undefined) order.customerName = updateFields.customerName;
  if (updateFields.phone !== undefined) order.phone = updateFields.phone;
  if (updateFields.city !== undefined) order.city = updateFields.city;
  if (updateFields.address !== undefined) order.address = updateFields.address;
  if (updateFields.product !== undefined) order.product = updateFields.product;
  if (updateFields.price !== undefined) order.price = Number(updateFields.price) || 0;
  if (updateFields.paymentMethod !== undefined) order.paymentMethod = updateFields.paymentMethod;
  if (updateFields.status !== undefined) order.status = updateFields.status;
  if (updateFields.deliveryNotes !== undefined) order.deliveryNotes = updateFields.deliveryNotes;
  if (updateFields.petInfo !== undefined) order.petInfo = updateFields.petInfo;
  if (updateFields.status === 'DELIVERED' && !order.deliveredAt) order.deliveredAt = new Date().toISOString();
  if (updateFields.deliveredAt !== undefined) order.deliveredAt = updateFields.deliveredAt;
  if (updateFields.followUpSent !== undefined) order.followUpSent = updateFields.followUpSent;
  if (updateFields.followUpSentAt !== undefined) order.followUpSentAt = updateFields.followUpSentAt;
  order.updatedAt = new Date().toISOString();

  writeJsonFile(ORDERS_FILE, orders);
  syncOrdersToCsv();
  console.log('[Storage] Order updated successfully:', orderId, updateFields);
  return order;
}

/**
 * Deletes an order permanently from storage
 */
export function deleteOrder(orderId) {
  let orders = readJsonFile(ORDERS_FILE, []);
  const beforeCount = orders.length;
  orders = orders.filter((o) => o.id !== orderId);
  if (orders.length !== beforeCount) {
    writeJsonFile(ORDERS_FILE, orders);
    syncOrdersToCsv();
    console.log('[Storage] Order deleted successfully:', orderId);
    return true;
  }
  return false;
}
