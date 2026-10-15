import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TMP_STOCK_FILE = '/tmp/stock.json';
const LOCAL_STOCK_FILE = path.resolve(__dirname, '../config/stock.json');

const DEFAULT_STOCK = {
  paws: { name: 'დრაკონის თათები', inStock: true, quantity: 5, productionHours: 24 },
  lung: { name: 'ღრუბელი', inStock: true, quantity: 5, productionHours: 24 },
  liver: { name: 'სუპერ-კუბები', inStock: true, quantity: 5, productionHours: 24 },
  powder: { name: 'ჯადოსნური პუდრა', inStock: true, quantity: 5, productionHours: 24 },
  full_pack: { name: 'Full Pack (სრული ნაკრები)', inStock: true, quantity: 5, productionHours: 24 }
};

let cachedStock = null;

export function getStock() {
  if (cachedStock) return cachedStock;

  try {
    if (fs.existsSync(TMP_STOCK_FILE)) {
      cachedStock = JSON.parse(fs.readFileSync(TMP_STOCK_FILE, 'utf8'));
      return cachedStock;
    }
  } catch (e) {}

  try {
    if (fs.existsSync(LOCAL_STOCK_FILE)) {
      cachedStock = JSON.parse(fs.readFileSync(LOCAL_STOCK_FILE, 'utf8'));
      return cachedStock;
    }
  } catch (e) {}

  cachedStock = { ...DEFAULT_STOCK };
  return cachedStock;
}

export function updateStock(key, updates = {}) {
  const stock = getStock();
  if (!stock[key]) return null;

  if (typeof updates.inStock === 'boolean') {
    stock[key].inStock = updates.inStock;
  }

  if (typeof updates.delta === 'number') {
    const currentQty = typeof stock[key].quantity === 'number' ? stock[key].quantity : 5;
    const newQty = Math.max(0, currentQty + updates.delta);
    stock[key].quantity = newQty;
    stock[key].inStock = newQty > 0;
  } else if (typeof updates.quantity === 'number') {
    const newQty = Math.max(0, updates.quantity);
    stock[key].quantity = newQty;
    stock[key].inStock = newQty > 0;
  }

  cachedStock = stock;

  try {
    fs.writeFileSync(TMP_STOCK_FILE, JSON.stringify(stock, null, 2), 'utf8');
  } catch (e) {}

  try {
    if (fs.existsSync(LOCAL_STOCK_FILE)) {
      fs.writeFileSync(LOCAL_STOCK_FILE, JSON.stringify(stock, null, 2), 'utf8');
    }
  } catch (e) {}

  return stock;
}
