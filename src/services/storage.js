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
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
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
  const newOrder = {
    id: `KHR-${Date.now().toString().slice(-6)}`,
    createdAt: new Date().toISOString(),
    status: 'PENDING', // PENDING, CONFIRMED, DISPATCHED, DELIVERED, CANCELLED
    ...orderData,
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
  return readJsonFile(ORDERS_FILE, []);
}

// Initial sync on startup
syncOrdersToCsv();

/**
 * Retrieves or initializes customer chat session history.
 */
// In-memory cache for fast, seamless context persistence across warm serverless requests
const memorySessions = new Map();

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
  // Keep last 15 messages for token efficiency and relevant context
  if (session.history.length > 15) {
    session.history = session.history.slice(-15);
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
