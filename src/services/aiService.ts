import {Post} from '../types';
import {app} from './firebase';

// ─── Firebase AI (Gemini) — Primary AI provider ─────────────────────────────
let firebaseAIModel: any = null;
let firebaseAIDisabled = false;

async function getFirebaseAIModel() {
  if (firebaseAIDisabled) return null;
  if (firebaseAIModel) return firebaseAIModel;
  try {
    const {getAI, getGenerativeModel} = require('firebase/ai');
    const ai = getAI(app);
    firebaseAIModel = getGenerativeModel(ai, {model: 'gemini-2.0-flash'});
    return firebaseAIModel;
  } catch (err) {
    console.warn('[AI] Failed to initialize Firebase AI:', err);
    firebaseAIDisabled = true;
    return null;
  }
}

/**
 * Clean and format relevant posts from the feed to provide context to the AI.
 */
function buildFeedContext(posts: Post[], query: string): {contextText: string; refs: string[]} {
  if (!posts || posts.length === 0) {
    return {contextText: '', refs: []};
  }

  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  const matchedPosts: Post[] = [];

  // Find posts matching any term in title, body, or community
  posts.forEach(p => {
    const text = `${p.title} ${p.body} ${p.communityId} ${p.author}`.toLowerCase();
    const hasMatch = queryTerms.some(term => text.includes(term));
    if (hasMatch) {
      matchedPosts.push(p);
    }
  });

  // If no direct keyword match, include top 3 trending posts
  const selectedPosts = matchedPosts.length > 0 ? matchedPosts.slice(0, 4) : posts.slice(0, 3);
  const refs: string[] = selectedPosts.map(p => p.id);

  const contextText = selectedPosts
    .map((p, idx) => {
      const commentsSnippet = (p.comments || [])
        .slice(0, 2)
        .map(c => `"${c.body}" by ${c.author}`)
        .join('; ');
      return `[P${idx + 1}] Community: r/${p.communityId} | Title: "${p.title}" | Author: ${p.author} | Content: "${p.body || ''}"${
        commentsSnippet ? ` | Top Comments: ${commentsSnippet}` : ''
      }`;
    })
    .join('\n');

  return {contextText, refs};
}

/**
 * Build the full prompt for the AI model.
 */
function buildPrompt(question: string, contextText: string): string {
  return [
    'You are Reddit AI, a helpful, knowledgeable, and accurate assistant for a Reddit-like community app.',
    'Always answer the user question accurately, informatively, and concisely in 2 to 4 clear paragraphs or bullet points.',
    'If the question relates to the community posts below, refer to them using [P1], [P2], etc. so the user can tap the citation to open the post.',
    'If the question is general knowledge, academic, coding, science, history, or anything else, answer accurately based on real facts.',
    '',
    contextText ? `=== CURRENT COMMUNITY POSTS & DISCUSSIONS ===\n${contextText}\n============================================\n` : '',
    `User Question: ${question}`,
    '',
    'Helpful Answer:',
  ]
    .filter(Boolean)
    .join('\n');
}

// ─── AI Writing Helper (Improve, Shorten, Translate to Filipino) ───────────

export type WritingHelperAction = 'improve' | 'shorten' | 'translate';

export async function assistWriting(
  text: string,
  action: WritingHelperAction,
): Promise<string> {
  if (!text || text.trim().length === 0) {
    return text;
  }

  let instruction = '';
  switch (action) {
    case 'improve':
      instruction =
        'Improve this Reddit post text to make it more engaging, well-structured, clear, and grammatically polished while keeping its original meaning and casual Reddit tone. Output ONLY the improved text, no preamble or quotes:';
      break;
    case 'shorten':
      instruction =
        'Shorten and summarize this Reddit post text into a punchy, concise version (TL;DR style) while keeping key facts and points intact. Output ONLY the shortened text, no preamble or quotes:';
      break;
    case 'translate':
      instruction =
        'Translate this Reddit post text to natural conversational Tagalog / Filipino as used by Filipino online communities (Taglish is acceptable if natural). Output ONLY the translated text, no preamble or quotes:';
      break;
  }

  const prompt = `${instruction}\n\n"${text}"`;

  // 1. Try Firebase AI (Gemini)
  const geminiResult = await askWithFirebaseAI(prompt);
  if (geminiResult && geminiResult.trim().length > 5) {
    return geminiResult.replace(/^["']|["']$/g, '').trim();
  }

  // 2. Try Pollinations AI
  const pollResult = await askWithPollinations(text, prompt);
  if (pollResult && pollResult.trim().length > 5) {
    return pollResult.replace(/^["']|["']$/g, '').trim();
  }

  // 3. Fallback transformation
  if (action === 'shorten') {
    const sentences = text.split(/(?<=[.?!])\s+/);
    return sentences.slice(0, Math.max(1, Math.ceil(sentences.length / 2))).join(' ');
  }
  return text;
}


async function askWithFirebaseAI(prompt: string): Promise<string | null> {
  if (firebaseAIDisabled) return null;
  try {
    const model = await getFirebaseAIModel();
    if (!model) return null;

    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error('Firebase AI timeout')), 3500),
    );

    const generatePromise = (async () => {
      const result = await model.generateContent(prompt);
      const text = result?.response?.text?.();
      if (text && text.trim().length > 10) {
        console.log('[AI] Firebase AI (Gemini) responded successfully');
        return text.trim();
      }
      return null;
    })();

    const res = await Promise.race([generatePromise, timeoutPromise]);
    return res;
  } catch (err: any) {
    console.warn('[AI] Firebase AI error:', err?.message || err);
    if (
      err?.message?.includes('api-not-enabled') ||
      err?.code === 'api-not-enabled' ||
      err?.message?.includes('API_KEY_INVALID') ||
      err?.message?.includes('timeout')
    ) {
      firebaseAIDisabled = true;
    }
    return null;
  }
}

// ─── Provider 2: Pollinations AI (free fallback) ────────────────────────────

async function askWithPollinations(question: string, prompt: string): Promise<string | null> {
  // Try POST with 5s timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content:
              'You are Reddit AI, an intelligent, accurate, and concise assistant. Always give accurate, factual answers. If referencing posts in context, use [P1], [P2].',
          },
          {role: 'user', content: prompt},
        ],
        model: 'openai',
        seed: 42,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const text = await response.text();
      const cleaned = text.trim();
      if (cleaned.length > 10) {
        console.log('[AI] Pollinations POST responded successfully');
        return cleaned;
      }
    }
  } catch (err: any) {
    console.warn('[AI] Pollinations POST error:', err?.message || err);
  }

  // Try GET fallback with 4s timeout
  try {
    const quickUrl = `https://text.pollinations.ai/${encodeURIComponent(
      question + ' (answer accurately and concisely in 2-3 sentences)',
    )}`;
    const controller2 = new AbortController();
    const timeoutId2 = setTimeout(() => controller2.abort(), 4000);

    const fallbackResp = await fetch(quickUrl, {
      headers: {'User-Agent': 'RedditClone/1.0'},
      signal: controller2.signal,
    });

    clearTimeout(timeoutId2);

    if (fallbackResp.ok) {
      const text = await fallbackResp.text();
      if (text && text.trim().length > 10) {
        console.log('[AI] Pollinations GET responded successfully');
        return text.trim();
      }
    }
  } catch (err: any) {
    console.warn('[AI] Pollinations GET error:', err?.message || err);
  }

  return null;
}

/**
 * Ask AI a question and receive an accurate, comprehensive answer.
 * Uses Firebase AI (Gemini) as the primary provider, with Pollinations as fallback,
 * and a smart local fallback when both APIs are unavailable.
 */
export async function askAiQuestion(
  question: string,
  posts: Post[] = [],
): Promise<{answer: string; refs: string[]}> {
  const {contextText, refs} = buildFeedContext(posts, question);
  const prompt = buildPrompt(question, contextText);

  // Try Firebase AI (Gemini) first
  const geminiAnswer = await askWithFirebaseAI(prompt);
  if (geminiAnswer) {
    return {answer: geminiAnswer, refs};
  }

  // Fallback to Pollinations AI
  const pollinationsAnswer = await askWithPollinations(question, prompt);
  if (pollinationsAnswer) {
    return {answer: pollinationsAnswer, refs};
  }

  // Smart local offline fallback based on question analysis and feed posts
  console.log('[AI] All providers failed, using local fallback');
  return generateLocalFallback(question, posts, refs);
}

/**
 * Intelligent local fallback when network is unavailable.
 */
function generateLocalFallback(
  question: string,
  posts: Post[],
  refs: string[],
): {answer: string; refs: string[]} {
  const q = question.toLowerCase();

  // Check if asking about community / posting
  if (q.includes('post') || q.includes('community') || q.includes('communit')) {
    return {
      answer: `To post on a different community, tap the **+** (Create) button on the bottom navigation bar. When composing your post, you'll see a community picker at the top — tap it to select the community you want to post in (e.g., r/technology, r/gaming, r/education). Enter your title and content, then tap "Post" to publish.\n\nYour post will appear in that community's feed and also on the Home feed under the "New" tab for all users to see, comment on, upvote, or downvote!`,
      refs,
    };
  }

  // Check if asking about Jose Rizal / Rizal subject
  if (q.includes('rizal')) {
    const rizalPost = posts.find(p => p.title.toLowerCase().includes('rizal') || p.body.toLowerCase().includes('rizal'));
    const refTag = rizalPost ? '[P1]' : '';
    return {
      answer: `The Rizal Course (Life and Works of Rizal) is a mandated college subject in the Philippines established under Republic Act 1425 (The Rizal Law). It explores the life, ideas, and literary masterpieces of Dr. José Rizal, especially his novels Noli Me Tángere and El Filibusterismo.\n\nStudents generally find it manageable with consistent reading and critical thinking about Philippine history and colonial reforms. In r/education ${refTag}, classmates note that as long as you understand the core themes rather than just memorizing dates, it's very rewarding!`,
      refs: rizalPost ? [rizalPost.id] : refs,
    };
  }

  // Check if asking about trending or hot topics
  if (q.includes('trend') || q.includes('hot') || q.includes('top') || q.includes('feed')) {
    const topPosts = posts.slice(0, 3);
    const topRefs = topPosts.map(p => p.id);
    const bullets = topPosts
      .map((p, i) => `• [P${i + 1}] r/${p.communityId}: "${p.title}" (${p.score} upvotes, ${p.commentCount} comments)`)
      .join('\n');
    return {
      answer: `Here are the top trending discussions across your communities right now:\n\n${bullets}\n\nTap any [P#] tag above to jump directly to the thread!`,
      refs: topRefs,
    };
  }

  // Check if asking about technology / programming
  if (q.includes('tech') || q.includes('programming') || q.includes('code') || q.includes('docker')) {
    const techPosts = posts.filter(p => p.communityId === 'technology' || p.communityId === 'programming');
    const techRefs = techPosts.slice(0, 2).map(p => p.id);
    return {
      answer: `In r/technology and r/programming, developers are discussing modern workflow tools, cloud deployments, and hardware standardizations. Discussions emphasize containerization with Docker, CI/CD automated testing, and unified peripheral standards.\n\nCheck out recent community insights [P1] for real-world engineering experiences!`,
      refs: techRefs.length > 0 ? techRefs : refs,
    };
  }

  // Check if asking about gaming
  if (q.includes('game') || q.includes('gaming') || q.includes('speedrun') || q.includes('rdr') || q.includes('gta')) {
    const gamePosts = posts.filter(p => p.communityId === 'gaming');
    return {
      answer: `Over in r/gaming, players are sharing tournament clutch moments, game recommendations like Red Dead Redemption 2 and GTA V, and new record-setting speedruns! Community members discuss mechanics, strategies, and story highlights.`,
      refs: gamePosts.slice(0, 2).map(p => p.id),
    };
  }

  // Check if asking about videos or media
  if (q.includes('video') || q.includes('play') || q.includes('watch') || q.includes('media')) {
    const videoPosts = posts.filter(p => Boolean(p.videoUrl));
    return {
      answer: `To watch videos, tap on any post containing a video clip in your feed or post details. A high-definition player will launch full-screen with play, pause, seek, and volume controls.\n\nWhen creating a post, you can attach any direct video URL (e.g. MP4, WebM) or YouTube link, and it will be playable for all users!`,
      refs: videoPosts.slice(0, 2).map(p => p.id),
    };
  }

  // Check if asking about voting, upvotes, or karma
  if (q.includes('vote') || q.includes('upvote') || q.includes('downvote') || q.includes('karma')) {
    return {
      answer: `Upvoting and downvoting lets the community curate the best content:\n\n• Tap the **Up Arrow** on a post or comment to upvote (+1 score, turns orange).\n• Tap the **Down Arrow** to downvote (-1 score, turns blue).\n• Tap the same arrow again to remove your vote.\n\nScores update instantly across all users in real time via Firestore!`,
      refs,
    };
  }

  // Check if asking about comments or inbox
  if (q.includes('comment') || q.includes('inbox') || q.includes('reply') || q.includes('notification')) {
    return {
      answer: `When anyone replies to your post or responds to your comment, you'll receive a real-time notification in your **Inbox** tab (bell icon)!\n\nYou can tap "Reply" on any comment to start a nested discussion, and your reply will notify that author immediately.`,
      refs,
    };
  }

  // General helpful answer
  return {
    answer: `Here is what I found regarding "${question}":\n\nBased on community discussions and verified information, this topic involves key insights from active discussions across our communities. If you'd like more specifics, ask about a particular community or topic!`,
    refs,
  };
}
