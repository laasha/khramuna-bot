import { replyToComment, sendPrivateReply } from './facebook.js';
import { getRecentFeedReplies, isCommentReplied, markCommentReplied, saveFeedReply } from './storage.js';
import { generateFeedCommentReply } from './ai.js';

const PAGE_ID = '928195650386088';

/**
 * Handles responding to a user comment on Feed/Posts/Groups with natural authority tone.
 * Enforces human-like 2-5 minute delay (120,000 - 300,000 ms) and deduplication.
 */
export async function handleCommentAction({ commentId, commenterName = '', commentText = '', postText = '', isInstagram = false }) {
  if (!commentId) return;

  // Deduplication check
  if (isCommentReplied(commentId)) {
    return;
  }

  // 1. Natural Human Jitter / Delay
  // In Vercel serverless environment, cap at 500ms to avoid lambda execution timeout.
  const isVercel = process.env.VERCEL === '1';
  const delayMs = isVercel ? 500 : Math.floor(Math.random() * 60000) + 15000;
  
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

    console.log(`[Comment Service] Sending public reply to ${isInstagram ? 'Instagram' : 'Facebook'} comment ${commentId}: "${publicReply}"`);
    const publicSuccess = await replyToComment(commentId, publicReply, isInstagram);

    if (publicSuccess) {
      saveFeedReply(publicReply);
      markCommentReplied(commentId);
      console.log(`[Comment Service] Public reply successfully posted for comment ${commentId}`);

      // If customer had a direct inquiry, send additional private reply
      if (isDirectInquiry && privateReply) {
        console.log(`[Comment Service] Sending private reply for direct inquiry under comment ${commentId}`);
        await sendPrivateReply(commentId, privateReply);
      }
    } else {
      console.warn(`[Comment Service] Public reply failed for comment ${commentId}. Checking private fallback...`);
      // Fallback: If Facebook public reply failed (e.g. missing pages_manage_engagement scope),
      // send a private reply via Messenger so the customer is never left unanswered!
      if (!isInstagram) {
        const fallbackText = privateReply || publicReply;
        console.log(`[Comment Service] Sending private Messenger fallback for comment ${commentId}: "${fallbackText}"`);
        const privateSent = await sendPrivateReply(commentId, fallbackText);
        if (privateSent) {
          markCommentReplied(commentId);
          console.log(`[Comment Service] Private fallback reply delivered to commenter for ${commentId}`);
        }
      }
    }
  } catch (err) {
    console.error(`[Comment Service] Error processing comment ${commentId}:`, err.message);
  }
}

/**
 * Checks recent Facebook and Instagram posts for unreplied comments created within the last 4 hours.
 */
export async function checkNewComments() {
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token) return;

  const cutoffTime = Date.now() - 24 * 60 * 60 * 1000;

  // 1. Check Facebook Page Posts (correct endpoint: /posts)
  try {
    const url = `https://graph.facebook.com/v19.0/${PAGE_ID}/posts?fields=id,message,comments{id,message,from,created_time,comments{id,message,from,created_time}}&limit=10&access_token=${token}`;
    const res = await fetch(url);
    const json = await res.json();

    if (json.data && Array.isArray(json.data)) {
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

          // Check top-level comment and its sub-comments
          const subComments = c.comments?.data || [];
          const hasTopPageReply = subComments.some((sc) => sc.from?.id === PAGE_ID);

          if (!hasTopPageReply && !isCommentReplied(c.id)) {
            const rawName = c.from?.name || '';
            console.log(`[Auto-Monitor] Found fresh Facebook comment from ${rawName || 'Customer'} (${c.id}): "${c.message || ''}"`);
            handleCommentAction({
              commentId: c.id,
              commenterName: rawName,
              commentText: c.message || '',
              postText,
              isInstagram: false,
            }).catch((err) => console.error('[Auto-Monitor] Error handling FB comment:', err));
          } else {
            markCommentReplied(c.id);
          }

          // Check for fresh user replies inside the sub-comment thread
          for (const sc of subComments) {
            if (!sc.id || sc.from?.id === PAGE_ID) continue;
            if (isCommentReplied(sc.id)) continue;

            const scTime = new Date(sc.created_time).getTime();
            if (scTime < cutoffTime) {
              markCommentReplied(sc.id);
              continue;
            }

            // Find if there is any page reply created AFTER this sub-comment
            const hasReplyAfterSc = subComments.some((other) => {
              if (other.from?.id !== PAGE_ID) return false;
              const otherTime = new Date(other.created_time).getTime();
              return otherTime >= scTime;
            });

            if (hasReplyAfterSc) {
              markCommentReplied(sc.id);
              continue;
            }

            const scName = sc.from?.name || '';
            console.log(`[Auto-Monitor] Found unreplied follow-up comment in thread from ${scName || 'Customer'} (${sc.id}): "${sc.message || ''}"`);
            handleCommentAction({
              commentId: sc.id,
              commenterName: scName,
              commentText: sc.message || '',
              postText,
              isInstagram: false,
            }).catch((err) => console.error('[Auto-Monitor] Error handling sub-comment:', err));
          }
        }
      }
    }
  } catch (err) {
    console.error('[Auto-Monitor] Error polling Facebook posts:', err.message);
  }

  // 2. Check Linked Instagram Media Comments
  try {
    const igAccRes = await fetch(`https://graph.facebook.com/v19.0/${PAGE_ID}?fields=instagram_business_account&access_token=${token}`);
    const igAccJson = await igAccRes.json();
    const igId = igAccJson.instagram_business_account?.id;
    if (igId) {
      const igMediaUrl = `https://graph.facebook.com/v19.0/${igId}/media?fields=id,caption,comments{id,text,username,timestamp,from,replies{id,from}}&limit=8&access_token=${token}`;
      const igRes = await fetch(igMediaUrl);
      const igJson = await igRes.json();
      if (igJson.data && Array.isArray(igJson.data)) {
        for (const media of igJson.data) {
          const postText = media.caption || '';
          const comments = media.comments?.data || [];
          for (const c of comments) {
            if (!c.id) continue;
            if (isCommentReplied(c.id)) continue;

            const cTime = new Date(c.timestamp).getTime();
            if (cTime < cutoffTime) {
              markCommentReplied(c.id);
              continue;
            }

            const subReplies = c.replies?.data || [];
            const alreadyReplied = subReplies.some((sr) => sr.from?.id === igId || sr.username === 'khramuna');
            if (alreadyReplied) {
              markCommentReplied(c.id);
              continue;
            }

            console.log(`[Auto-Monitor] Found fresh IG comment from @${c.username || 'User'} (${c.id}): "${c.text || ''}"`);
            handleCommentAction({
              commentId: c.id,
              commenterName: c.username || '',
              commentText: c.text || '',
              postText,
              isInstagram: true,
            }).catch((err) => console.error('[Auto-Monitor] Error handling IG comment:', err));
          }
        }
      }
    }
  } catch (igErr) {
    console.error('[Auto-Monitor] Error polling Instagram media:', igErr.message);
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
