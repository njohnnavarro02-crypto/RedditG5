/**
 * firestoreService.ts
 *
 * Typed helpers for every Firestore collection defined in the data model:
 *   users/{uid}           – user profiles
 *   posts/{postId}        – community posts
 *   admins/{uid}          – administrator registry (read-only from the app)
 *   summaries/latest      – AI-generated post summary (any signed-in user)
 *   insights/latest       – AI-generated insights (administrators only)
 */

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  increment,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
  SnapshotOptions,
  FirestoreDataConverter,
  writeBatch,
} from 'firebase/firestore';
import {app, auth} from './firebase';

// ─── Firestore instance ───────────────────────────────────────────────────────

export const db = getFirestore(app);

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserProfile {
  displayName: string;
  email: string;
  photoURL: string;
  createdAt: Timestamp | null;
  disabled: boolean;
}

export interface FirestorePost {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoUrl: string;
  title: string;
  text: string;
  communityId: string;
  createdAt: Timestamp | null;
  imageUrl?: string;
  videoUrl?: string;
  linkUrl?: string;
  likeCount: number;
}

export interface FirestoreComment {
  id: string;
  authorId: string;
  authorName: string;
  authorPhotoUrl?: string;
  body: string;
  score: number;
  createdAt: Timestamp | null;
  replyToId?: string;
  replyToAuthor?: string;
}

export interface FirestoreCommunity {
  id: string;
  color: string;
  members: string;
  online: string;
  description: string;
  createdAt?: Timestamp | null;
}

export interface Summary {
  text: string;
  postCount: number;
  lastPostAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface Insights {
  topics: string[];
  mood: string;
  updatedAt: Timestamp | null;
}

// ─── Converters ──────────────────────────────────────────────────────────────

const postConverter: FirestoreDataConverter<FirestorePost> = {
  toFirestore(post: FirestorePost): DocumentData {
    const {id: _id, ...rest} = post;
    return rest;
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions,
  ): FirestorePost {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      authorId: data.authorId ?? '',
      authorName: data.authorName ?? '',
      authorPhotoUrl: data.authorPhotoUrl ?? '',
      title: data.title ?? '',
      text: data.text ?? '',
      communityId: data.communityId ?? 'technology',
      createdAt: data.createdAt ?? null,
      imageUrl: data.imageUrl,
      videoUrl: data.videoUrl,
      linkUrl: data.linkUrl,
      likeCount: data.likeCount ?? 0,
    };
  },
};

// ─── users/{uid} ─────────────────────────────────────────────────────────────

/**
 * Create or overwrite the signed-in user's Firestore profile.
 * Called right after Google Sign-In succeeds or when user updates profile.
 * Note: Never includes 'disabled' since firestore.rules strictly forbids
 * clients from writing to the 'disabled' field (!('disabled' in request.resource.data)).
 */
export async function upsertUserProfile(uid: string, profile: Omit<UserProfile, 'disabled' | 'createdAt'>): Promise<void> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    // First-time creation — do NOT include disabled field
    await setDoc(ref, {
      displayName: profile.displayName,
      email: profile.email,
      photoURL: profile.photoURL,
      createdAt: serverTimestamp(),
    });
  } else {
    // Subsequent logins/updates — update mutable profile fields
    await updateDoc(ref, {
      displayName: profile.displayName,
      email: profile.email,
      photoURL: profile.photoURL,
    });
  }
}

/**
 * Fetch a user profile by UID. Returns null when the document does not exist.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

// ─── admins/{uid} ────────────────────────────────────────────────────────────

/**
 * Returns true when the signed-in user has an admins/{uid} document.
 * This is a client-side check only — Firestore security rules enforce it server-side.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    return false;
  }
  const snap = await getDoc(doc(db, 'admins', uid));
  return snap.exists();
}

// ─── posts/{postId} ──────────────────────────────────────────────────────────

/**
 * Create a new post. The authorId is taken from the currently signed-in user.
 * Returns the new post's Firestore document ID.
 */
export async function createPost(
  title: string,
  text: string,
  communityId: string = 'technology',
  media?: {imageUrl?: string; videoUrl?: string; linkUrl?: string},
  customAuthorName?: string,
  customAuthorPhoto?: string,
): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be signed in to create a post.');
  }

  const payload: Omit<FirestorePost, 'id'> = {
    authorId: user.uid,
    authorName: customAuthorName || user.displayName || user.email || 'Anonymous',
    authorPhotoUrl: customAuthorPhoto || user.photoURL || '',
    title,
    text,
    communityId,
    createdAt: serverTimestamp() as unknown as Timestamp,
    likeCount: 0,
    ...(media?.imageUrl ? {imageUrl: media.imageUrl} : {}),
    ...(media?.videoUrl ? {videoUrl: media.videoUrl} : {}),
    ...(media?.linkUrl ? {linkUrl: media.linkUrl} : {}),
  };

  const ref = await addDoc(
    collection(db, 'posts'),
    payload,
  );
  return ref.id;
}

// ─── comments (subcollection: posts/{postId}/comments/{commentId}) ───────────

/**
 * Add a comment or reply to a post in Firestore.
 */
export async function addFirestoreComment(
  postId: string,
  body: string,
  authorName: string,
  authorPhoto?: string,
  replyTo?: {id: string; author: string},
): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be signed in to comment.');
  }

  const payload: any = {
    authorId: user.uid,
    authorName: authorName || user.displayName || user.email || 'Anonymous',
    authorPhotoUrl: authorPhoto || user.photoURL || '',
    body,
    score: 0,
    createdAt: serverTimestamp(),
  };

  if (replyTo) {
    payload.replyToId = replyTo.id;
    payload.replyToAuthor = replyTo.author;
  }

  const ref = await addDoc(
    collection(db, 'posts', postId, 'comments'),
    payload,
  );
  return ref.id;
}

// ─── comment votes (posts/{postId}/comments/{commentId}/votes/{uid}) ────────

/**
 * Cast or remove a vote on a comment in Firestore.
 */
export async function castFirestoreCommentVote(
  postId: string,
  commentId: string,
  value: 1 | -1 | 0,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const ref = doc(db, 'posts', postId, 'comments', commentId, 'votes', user.uid);
  if (value === 0) {
    await deleteDoc(ref).catch(() => {});
  } else {
    await setDoc(ref, {
      value,
      updatedAt: serverTimestamp(),
    }).catch(() => {});
  }
}

/**
 * Update a comment's score by delta.
 */
export async function updateCommentVoteScore(
  postId: string,
  commentId: string,
  delta: number,
): Promise<void> {
  if (delta === 0) return;
  await updateDoc(doc(db, 'posts', postId, 'comments', commentId), {
    score: increment(delta),
  }).catch(() => {});
}

/**
 * Real-time listener for comments on a specific post.
 */
export function subscribeFirestoreComments(
  postId: string,
  callback: (comments: FirestoreComment[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const q = query(
    collection(db, 'posts', postId, 'comments'),
    orderBy('createdAt', 'asc'),
  );

  return onSnapshot(
    q,
    snapshot => {
      const list: FirestoreComment[] = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          authorId: d.authorId || '',
          authorName: d.authorName || 'Anonymous',
          authorPhotoUrl: d.authorPhotoUrl,
          body: d.body || '',
          score: d.score || 0,
          createdAt: d.createdAt || null,
          replyToId: d.replyToId,
          replyToAuthor: d.replyToAuthor,
        };
      });
      callback(list);
    },
    error => {
      console.warn(`Firestore comments error for post ${postId}:`, error);
      onError?.(error);
    },
  );
}

// ─── joined communities (users/{uid}/joined/{communityId}) ───────────────────

/**
 * Toggle join/leave for a community in Firestore.
 */
export async function toggleJoinCommunity(
  communityId: string,
  joined: boolean,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const ref = doc(db, 'users', user.uid, 'joined', communityId);
  if (joined) {
    await setDoc(ref, {
      communityId,
      joinedAt: serverTimestamp(),
    });
  } else {
    await deleteDoc(ref);
  }
}

/**
 * Real-time listener for a user's joined communities.
 */
export function subscribeJoinedCommunities(
  uid: string,
  callback: (joinedIds: string[]) => void,
): () => void {
  return onSnapshot(
    collection(db, 'users', uid, 'joined'),
    snapshot => {
      const ids = snapshot.docs.map(d => d.id);
      callback(ids);
    },
    err => {
      console.warn('Joined communities subscription error:', err);
    },
  );
}

// ─── votes (posts/{postId}/votes/{uid}) ──────────────────────────────────────

/**
 * Cast or remove a vote in Firestore under posts/{postId}/votes/{uid}.
 */
export async function castFirestoreVote(
  postId: string,
  value: 1 | -1 | 0,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const ref = doc(db, 'posts', postId, 'votes', user.uid);
  if (value === 0) {
    await deleteDoc(ref).catch(() => {});
  } else {
    await setDoc(ref, {
      value,
      updatedAt: serverTimestamp(),
    }).catch(() => {});
  }
}

/**
 * Real-time listener for a user's vote on posts.
 */
export function subscribeUserVotes(
  postId: string,
  uid: string,
  callback: (vote: 1 | -1 | 0) => void,
): () => void {
  return onSnapshot(
    doc(db, 'posts', postId, 'votes', uid),
    snap => {
      if (snap.exists()) {
        const val = snap.data().value;
        callback(val === 1 || val === -1 ? val : 0);
      } else {
        callback(0);
      }
    },
    () => {
      callback(0);
    },
  );
}

/**
 * Real-time listener for posts, ordered by newest first.
 */
export function subscribePosts(
  callback: (posts: FirestorePost[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const q = query(
    collection(db, 'posts').withConverter(postConverter),
    orderBy('createdAt', 'desc'),
  );

  return onSnapshot(
    q,
    snapshot => {
      const posts = snapshot.docs.map(doc => doc.data());
      callback(posts);
    },
    error => {
      console.warn('Firestore posts subscription error:', error);
      onError?.(error);
    },
  );
}

/**
 * Fetch all posts ordered by newest first.
 */
export async function fetchPosts(): Promise<FirestorePost[]> {
  const q = query(
    collection(db, 'posts').withConverter(postConverter),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

/**
 * Fetch posts authored by a specific user (requires composite index on authorId + createdAt).
 * Firebase will log a link to create the index the first time this runs.
 */
export async function fetchPostsByUser(uid: string): Promise<FirestorePost[]> {
  const q = query(
    collection(db, 'posts').withConverter(postConverter),
    where('authorId', '==', uid),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

/**
 * Update a post's title, text, or media. Only the author can do this (enforced by rules).
 */
export async function editPost(
  postId: string,
  updates: {
    title?: string;
    text?: string;
    imageUrl?: string;
    videoUrl?: string;
    linkUrl?: string;
  },
): Promise<void> {
  await updateDoc(doc(db, 'posts', postId), updates);
}

/**
 * Increment or decrement a post's likeCount by 1.
 * Any signed-in user can call this (enforced by security rules).
 */
/**
 * Increment or decrement a post's likeCount/score by delta.
 * Any signed-in user can call this (enforced by security rules).
 */
export async function updatePostVoteScore(postId: string, delta: number): Promise<void> {
  if (delta === 0) return;
  await updateDoc(doc(db, 'posts', postId), {
    likeCount: increment(delta),
  }).catch(() => {});
}

export async function toggleLike(postId: string, liked: boolean): Promise<void> {
  await updateDoc(doc(db, 'posts', postId), {
    likeCount: increment(liked ? 1 : -1),
  });
}

/**
 * Delete a post. Only the author or an admin can do this (enforced by rules).
 */
export async function deletePost(postId: string): Promise<void> {
  await deleteDoc(doc(db, 'posts', postId));
}

// ─── summaries/latest ────────────────────────────────────────────────────────

/**
 * Read the latest AI-generated summary (any signed-in user).
 */
export async function fetchSummary(): Promise<Summary | null> {
  const snap = await getDoc(doc(db, 'summaries', 'latest'));
  return snap.exists() ? (snap.data() as Summary) : null;
}

/**
 * Write the latest AI-generated summary (any signed-in user).
 */
export async function writeSummary(
  data: Omit<Summary, 'updatedAt'>,
): Promise<void> {
  await setDoc(doc(db, 'summaries', 'latest'), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ─── insights/latest ─────────────────────────────────────────────────────────

/**
 * Read the latest AI-generated insights (any signed-in user).
 */
export async function fetchInsights(): Promise<Insights | null> {
  const snap = await getDoc(doc(db, 'insights', 'latest'));
  return snap.exists() ? (snap.data() as Insights) : null;
}

/**
 * Write the latest AI-generated insights (administrators only — enforced by rules).
 */
export async function writeInsights(
  data: Omit<Insights, 'updatedAt'>,
): Promise<void> {
  await setDoc(doc(db, 'insights', 'latest'), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}


/**
 * Real-time listener for user profiles to reflect profile updates across all users immediately.
 */
export function subscribeUserProfiles(
  callback: (profiles: Record<string, {displayName?: string; photoURL?: string}>) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    collection(db, 'users'),
    snapshot => {
      const map: Record<string, {displayName?: string; photoURL?: string}> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        map[doc.id] = {
          displayName: data.displayName,
          photoURL: data.photoURL,
        };
      });
      callback(map);
    },
    error => {
      console.warn('Firestore user profiles subscription error:', error);
      onError?.(error);
    },
  );
}

/**
 * Update all posts authored by a user with the new display name and avatar photo in Firestore.
 */
export async function updateUserPostsProfile(
  uid: string,
  newDisplayName: string,
  newPhotoUrl?: string,
): Promise<void> {
  const q = query(collection(db, 'posts'), where('authorId', '==', uid));
  const snap = await getDocs(q);
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach(docSnap => {
    const ref = docSnap.ref;
    const updates: Record<string, any> = { authorName: newDisplayName };
    if (newPhotoUrl !== undefined) {
      updates.authorPhotoUrl = newPhotoUrl;
    }
    batch.update(ref, updates);
  });
  await batch.commit();
}
export { updateUserPostsProfile as updateUserPostsAuthorName };
