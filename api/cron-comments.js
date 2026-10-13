import { checkNewComments } from '../src/services/commentMonitor.js';

export default async function handler(req, res) {
  try {
    console.log('[Cron] Running scheduled checkNewComments from api/cron-comments.js...');
    await checkNewComments();
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('[Cron Handler Error]:', err.message);
    res.status(500).json({ status: 'error', error: err.message });
  }
}
