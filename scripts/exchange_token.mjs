import 'dotenv/config';
import fs from 'node:fs';

const APP_ID = '1447844490571748';
const APP_SECRET = process.env.FB_APP_SECRET;

export async function getPermanentPageToken(shortLivedUserToken) {
  if (!APP_SECRET) {
    throw new Error('FB_APP_SECRET is missing in .env');
  }

  console.log('[Token Exchange] Step 1: Exchanging short-lived token for 60-day Long-Lived User Token...');
  const exchangeUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${shortLivedUserToken}`;
  const res1 = await fetch(exchangeUrl);
  const data1 = await res1.json();

  if (data1.error) {
    throw new Error(`Exchange Error: ${data1.error.message}`);
  }

  const longLivedUserToken = data1.access_token;
  console.log('[Token Exchange] Step 1 Success! Acquired 60-day User Token.');

  console.log('[Token Exchange] Step 2: Fetching Never-Expiring Page Access Token for Khramuna...');
  const accountsUrl = `https://graph.facebook.com/v21.0/me/accounts?access_token=${longLivedUserToken}`;
  const res2 = await fetch(accountsUrl);
  const data2 = await res2.json();

  if (data2.error) {
    throw new Error(`Accounts Error: ${data2.error.message}`);
  }

  const khramunaPage = (data2.data || []).find(p => p.id === '928195650386088' || p.name.includes('ხრამუნა'));
  if (!khramunaPage) {
    throw new Error('Khramuna page not found among user pages: ' + JSON.stringify(data2.data));
  }

  console.log(`[Token Exchange] Found Page "${khramunaPage.name}" (ID: ${khramunaPage.id})`);
  const permanentPageToken = khramunaPage.access_token;

  console.log('[Token Exchange] Step 3: Verifying token longevity with debug_token...');
  const appToken = `${APP_ID}|${APP_SECRET}`;
  const debugUrl = `https://graph.facebook.com/v21.0/debug_token?input_token=${permanentPageToken}&access_token=${appToken}`;
  const debugRes = await fetch(debugUrl);
  const debugData = await debugRes.json();

  const expiresAt = debugData.data?.expires_at;
  const isNever = expiresAt === 0 || !expiresAt;
  console.log(`[Token Exchange] Verification Result: expires_at=${expiresAt} (Never Expiring: ${isNever})`);

  return {
    permanentPageToken,
    isNever,
    pageName: khramunaPage.name,
    pageId: khramunaPage.id
  };
}

if (process.argv[2]) {
  getPermanentPageToken(process.argv[2])
    .then(r => console.log('RESULT:', r))
    .catch(e => console.error('FAILED:', e.message));
}
