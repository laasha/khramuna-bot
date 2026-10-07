/**
 * Meta Graph API service for Facebook Messenger & Instagram Messaging.
 */
const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';
const IG_GRAPH_API_BASE = 'https://graph.instagram.com/v19.0';

/**
 * Sends a text message to a specific recipient (PSID or IGSID).
 */
export async function sendMessengerMessage(recipientId, text) {
  const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;
  const igAccessToken = process.env.IG_ACCESS_TOKEN;

  if (!pageAccessToken && !igAccessToken) {
    console.warn('[Facebook] No Access Token configured. Cannot send message to:', recipientId);
    return false;
  }

  const payload = {
    recipient: { id: recipientId },
    message: { text },
  };

  // Try FB Graph API first
  if (pageAccessToken) {
    try {
      const res = await fetch(`${GRAPH_API_BASE}/me/messages?access_token=${pageAccessToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.error) {
        return true;
      }
      console.warn('[Facebook] Page Token message response:', data.error);
    } catch (err) {
      console.error('[Facebook] Network error sending message with Page Token:', err.message);
    }
  }

  // Fallback to IG Direct Graph API if available
  if (igAccessToken) {
    try {
      const res = await fetch(`${IG_GRAPH_API_BASE}/me/messages?access_token=${igAccessToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.error) {
        console.log('[Instagram] Message sent successfully via IG Token to:', recipientId);
        return true;
      }
      console.error('[Instagram] Error sending message via IG Token:', data.error);
    } catch (err) {
      console.error('[Instagram] Network error with IG Token:', err.message);
    }
  }

  return false;
}

/**
 * Sends a public reply to a Facebook post comment or Instagram comment.
 */
export async function replyToComment(commentId, text, isInstagram = false) {
  const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;
  const igAccessToken = process.env.IG_ACCESS_TOKEN;

  if (isInstagram && igAccessToken) {
    try {
      const res = await fetch(`${IG_GRAPH_API_BASE}/${commentId}/replies?access_token=${igAccessToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!data.error) {
        console.log(`[Instagram] Replied to comment ${commentId}:`, data.id);
        return true;
      }
    } catch (e) {}
  }

  if (pageAccessToken) {
    const endpoint = isInstagram
      ? `${GRAPH_API_BASE}/${commentId}/replies?access_token=${pageAccessToken}`
      : `${GRAPH_API_BASE}/${commentId}/comments?access_token=${pageAccessToken}`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!data.error) {
        console.log(`[Meta] Replied to comment ${commentId}:`, data.id);
        return true;
      }
      console.error('[Meta] Error replying to comment:', data.error);
    } catch (err) {
      console.error('[Meta] Error replying to comment:', err.message);
    }
  }

  return false;
}

/**
 * Sends a private Messenger message to someone who commented on a post.
 */
export async function sendPrivateReply(commentId, text) {
  const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!pageAccessToken) return false;

  const payload = {
    recipient: { comment_id: commentId },
    message: { text },
  };

  try {
    const res = await fetch(`${GRAPH_API_BASE}/me/messages?access_token=${pageAccessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.error) {
      console.error('[Facebook] Error sending private reply:', data.error);
      return false;
    }
    console.log(`[Facebook] Sent private reply for comment ${commentId}:`, data.message_id);
  } catch (err) {
    console.error('[Facebook] Error sending private reply:', err.message);
    return false;
  }
}

/**
 * Sends 'typing_on' indicator to the user.
 */
export async function sendSenderAction(recipientId, action = 'typing_on') {
  const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!pageAccessToken) return;

  try {
    await fetch(`${GRAPH_API_BASE}/me/messages?access_token=${pageAccessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        sender_action: action,
      }),
    });
  } catch (e) {
    // Ignore sender action errors
  }
}

/**
 * Sends Quick Reply buttons over the keyboard.
 */
export async function sendQuickReplies(recipientId, text, quickReplies) {
  const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!pageAccessToken) return false;

  const payload = {
    recipient: { id: recipientId },
    message: {
      text,
      quick_replies: quickReplies.map((qr) => ({
        content_type: 'text',
        title: qr.title.slice(0, 20),
        payload: qr.payload,
      })),
    },
  };

  try {
    const res = await fetch(`${GRAPH_API_BASE}/me/messages?access_token=${pageAccessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return !data.error;
  } catch (err) {
    console.error('[Facebook] Error sending quick replies:', err.message);
    return false;
  }
}

/**
 * Sends a carousel of product cards (Generic Template).
 */
export async function sendGenericTemplate(recipientId, elements) {
  const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!pageAccessToken) return false;

  const payload = {
    recipient: { id: recipientId },
    message: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'generic',
          elements,
        },
      },
    },
  };

  try {
    const res = await fetch(`${GRAPH_API_BASE}/me/messages?access_token=${pageAccessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.error) {
      console.error('[Facebook] Error sending generic template:', data.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Facebook] Error sending generic template:', err.message);
    return false;
  }
}

/**
 * Sends Khramuna's complete interactive product carousel.
 */
export async function sendProductCatalog(recipientId) {
  const elements = [
    {
      title: 'დრაკონის თათები (100გ) — 18₾',
      subtitle: '100% ქათმის ფეხი • ბუნებრივი კოლაგენი კბილებისა და სახსრებისთვის',
      buttons: [
        { type: 'postback', title: '🛒 შეკვეთა (18₾)', payload: 'ORDER_paws' },
        { type: 'postback', title: 'ℹ️ დეტალურად', payload: 'INFO_paws' },
      ],
    },
    {
      title: 'ღრუბელი (50გ) — 15₾',
      subtitle: '100% საქონლის ფილტვი • ჰაეროვანი, დაბალკალორიული, წვრთნისთვის',
      buttons: [
        { type: 'postback', title: '🛒 შეკვეთა (15₾)', payload: 'ORDER_lung' },
        { type: 'postback', title: 'ℹ️ დეტალურად', payload: 'INFO_lung' },
      ],
    },
    {
      title: 'სუპერ-კუბები (80გ) — 17₾',
      subtitle: '100% საქონლის ღვიძლი • A და B ჯგუფის ვიტამინები, ძლიერი არომატი',
      buttons: [
        { type: 'postback', title: '🛒 შეკვეთა (17₾)', payload: 'ORDER_liver' },
        { type: 'postback', title: 'ℹ️ დეტალურად', payload: 'INFO_liver' },
      ],
    },
    {
      title: 'ჯადოსნური პუდრა (40გ) — 12₾',
      subtitle: '100% ხორცის ფხვნილი • მადის აღმძვრელი ტოპინგი პრეტენზიული ძაღლებისთვის',
      buttons: [
        { type: 'postback', title: '🛒 შეკვეთა (12₾)', payload: 'ORDER_powder' },
        { type: 'postback', title: 'ℹ️ დეტალურად', payload: 'INFO_powder' },
      ],
    },
    {
      title: '🎁 Full Pack (სრული ნაკრები) — 49.50₾',
      subtitle: 'ოთხივე პროდუქტი ერთად (55₾-ის ნაცვლად) + 10% ფასდაკლებით',
      buttons: [
        { type: 'postback', title: '🛒 შეკვეთა (49.50₾)', payload: 'ORDER_full_pack' },
      ],
    },
  ];

  return await sendGenericTemplate(recipientId, elements);
}
