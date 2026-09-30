import { replyToComment, sendPrivateReply } from './facebook.js';
import { isCommentReplied, markCommentReplied } from './storage.js';
import { generateCommentReplies } from './ai.js';

const PAGE_ID = '928195650386088';

/**
 * Handles responding to a user comment both publicly and via private Messenger message.
 * Guaranteed to never reply more than once.
 */
export async function handleCommentAction({ commentId, commenterName = '', commentText = '' }) {
  if (!commentId) return;

  // Deduplication check
  if (isCommentReplied(commentId)) {
    return;
  }

  // Mark as replied immediately to prevent any race condition
  markCommentReplied(commentId);

  try {
    // Generate tailored, contextual replies via AI
    const { publicReply, privateReply } = await generateCommentReplies({
      commenterName,
      commentText,
    });

    console.log(`[Comment Service] Sending public reply to comment ${commentId}: "${publicReply}"`);
    await replyToComment(commentId, publicReply);

    console.log(`[Comment Service] Sending private reply to comment ${commentId}`);
    await sendPrivateReply(commentId, privateReply);
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
    const url = `https://graph.facebook.com/v19.0/${PAGE_ID}/published_posts?fields=id,comments{id,message,from,created_time,comments{id,from}}&limit=5&access_token=${token}`;
    const res = await fetch(url);
    const json = await res.json();

    if (!json.data) return;

    // Filter window: comments from the last 4 hours only (to avoid touching ancient posts)
    const cutoffTime = Date.now() - 4 * 60 * 60 * 1000;

    for (const post of json.data) {
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
        console.log(`[Auto-Monitor] Replying to fresh comment from ${rawName || 'Customer'} (${c.id}): "${c.message || ''}"`);

        await handleCommentAction({
          commentId: c.id,
          commenterName: rawName,
        });
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
