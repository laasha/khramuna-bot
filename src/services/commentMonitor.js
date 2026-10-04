import { replyToComment, sendPrivateReply } from './facebook.js';
import { getRecentFeedReplies, isCommentReplied, markCommentReplied, saveFeedReply } from './storage.js';
import { generateFeedCommentReply } from './ai.js';

const PAGE_ID = '928195650386088';

/**
 * Handles responding to a user comment on Feed/Posts/Groups with natural authority tone.
 * Enforces human-like 2-5 minute delay (120,000 - 300,000 ms) and deduplication.
 */
export async function handleCommentAction({ commentId, commenterName = '', commentText = '', postText = '' }) {
  if (!commentId) return;

  // Deduplication check
  if (isCommentReplied(commentId)) {
    return;
  }

  // Mark as replied immediately to prevent any concurrent race condition
  markCommentReplied(commentId);

  // 1. Natural Human Jitter / Delay (2 to 5 minutes: 120,000 - 300,000 ms)
  // In Vercel serverless environment, cap at 5-8s to avoid lambda execution timeout.
  const isVercel = process.env.VERCEL === '1';
  const minDelay = isVercel ? 5000 : 120000;
  const maxDelay = isVercel ? 8000 : 300000;
  const delayMs = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
  
  console.log(`[Comment Service] Scheduling reply to "${commenterName || 'Customer'}" (${commentId}) with human delay of ${(delayMs / 1000).toFixed(0)}s...`);
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  try {
    const recentReplies = getRecentFeedReplies(8);
    // Generate tailored Authority / Feed reply
    const { publicReply, isDirectInquiry, privateReply } = await generateFeedCommentReply({
      commenterName,
      commentText,
      postText,
      recentReplies,
    });

    console.log(`[Comment Service] Sending public authority reply to comment ${commentId}: "${publicReply}"`);
    await replyToComment(commentId, publicReply);
    saveFeedReply(publicReply);

    // Only send private reply if customer explicitly inquired about price/ordering/contact
    if (isDirectInquiry && privateReply) {
      console.log(`[Comment Service] Sending private reply for direct inquiry under comment ${commentId}`);
      await sendPrivateReply(commentId, privateReply);
    }
  } catch (err) {
    console.error(`[Comment Service] Error processing comment ${commentId}:`, err.message);
  }
}

/**
 * Checks recent posts for unreplied comments created within the last 4 hours.
 */
export async function checkNewComments() {
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token) return;

  try {
    const url = `https://graph.facebook.com/v19.0/${PAGE_ID}/published_posts?fields=id,message,comments{id,message,from,created_time,comments{id,from}}&limit=5&access_token=${token}`;
    const res = await fetch(url);
    const json = await res.json();

    if (!json.data) return;

    // Filter window: comments from the last 4 hours only (to avoid touching ancient posts)
    const cutoffTime = Date.now() - 4 * 60 * 60 * 1000;

    for (const post of json.data) {
      const postText = post.message || '';
      const comments = post.comments?.data || [];
      for (const c of comments) {
        if (!c.id) continue;

        // Skip if already tracked
        if (isCommentReplied(c.id)) continue;

        // Skip comments made by Khramuna page
        if (c.from && c.from.id === PAGE_ID) continue;

        // Skip comments created older than 4 hours
        const commentTime = new Date(c.created_time).getTime();
        if (commentTime < cutoffTime) {
          markCommentReplied(c.id);
          continue;
        }

        // Check if Khramuna has already replied under this comment thread on Facebook
        const subComments = c.comments?.data || [];
        const alreadyHasPageReply = subComments.some((sc) => sc.from?.id === PAGE_ID);
        if (alreadyHasPageReply) {
          markCommentReplied(c.id);
          continue;
        }

        const rawName = c.from?.name || '';
        console.log(`[Auto-Monitor] Found fresh comment from ${rawName || 'Customer'} (${c.id}): "${c.message || ''}"`);

        // Trigger asynchronous processing with human delay
        handleCommentAction({
          commentId: c.id,
          commenterName: rawName,
          commentText: c.message || '',
          postText,
        }).catch((err) => console.error('[Auto-Monitor] Error handling comment:', err));
      }
    }
  } catch (err) {
    // Polling error handled gracefully
  }
}

/**
 * Starts background interval polling every 20 seconds.
 */
export function startCommentMonitor(intervalMs = 20000) {
  console.log('🤖 კომენტარების ავტომატური მონიტორინგი გააქტიურდა...');
  checkNewComments();
  setInterval(checkNewComments, intervalMs);
}
