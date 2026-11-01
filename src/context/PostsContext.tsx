import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {POSTS} from '../data/mock';
import {Comment, MyVote, Post} from '../types';
import {USER_NAME} from '../theme';
import {
  auth,
  onAuthStateChanged,
  signInWithGoogle as authSignInWithGoogle,
  signOutEverywhere,
  User,
} from '../services/firebase';
import {
  createPost as firestoreCreatePost,
  editPost as firestoreEditPost,
  deletePost as firestoreDeletePost,
  toggleLike as firestoreToggleLike,
  subscribePosts,
  isCurrentUserAdmin,
  FirestorePost,
} from '../services/firestoreService';

function formatTimestamp(ts: any): {time: string; hoursAgo: number} {
  if (!ts) {
    return {time: 'just now', hoursAgo: 0};
  }
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 60) {
    return {time: 'just now', hoursAgo: 0};
  }
  if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    return {time: `${mins}m ago`, hoursAgo: mins / 60};
  }
  const hours = Math.floor(diffSec / 3600);
  if (hours < 24) {
    return {time: `${hours}h ago`, hoursAgo: hours};
  }
  const days = Math.floor(hours / 24);
  return {time: `${days}d ago`, hoursAgo: hours};
}

export type MediaAttachment = {
  imageUrl?: string;
  videoUrl?: string;
  linkUrl?: string;
};

type PostsContextValue = {
  user: User | null;
  signedIn: boolean;
  isAdmin: boolean;
  userName: string;
  userPhoto: string | null;
  loadingAuth: boolean;
  posts: Post[];
  signIn: () => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  toggleVote: (postId: string, dir: 1 | -1) => void;
  addPost: (
    communityId: string,
    title: string,
    body: string,
    media?: MediaAttachment,
  ) => Promise<Post>;
  editPost: (
    postId: string,
    updates: {
      title?: string;
      body?: string;
      imageUrl?: string;
      videoUrl?: string;
      linkUrl?: string;
    },
  ) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  canEditPost: (post: Post) => boolean;
  canDeletePost: (post: Post) => boolean;
  addComment: (postId: string, body: string) => void;
  updateProfile: (newName: string, newPhoto?: string) => Promise<void>;
};

const PostsContext = createContext<PostsContextValue | null>(null);

export function PostsProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [guestSignedIn, setGuestSignedIn] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [firestorePosts, setFirestorePosts] = useState<Post[]>([]);
  const [localPosts, setLocalPosts] = useState<Post[]>(POSTS);
  const [customUserName, setCustomUserName] = useState<string | null>(null);
  const [customUserPhoto, setCustomUserPhoto] = useState<string | null>(null);

  // Subscribe to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async currentUser => {
      setUser(currentUser);
      setLoadingAuth(false);
      if (currentUser) {
        try {
          const adminStatus = await isCurrentUserAdmin();
          setIsAdmin(adminStatus);
        } catch {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    });
    return unsubscribe;
  }, []);

  // Subscribe to Firestore posts when signed in
  useEffect(() => {
    if (!user) {
      setFirestorePosts([]);
      return;
    }

    const unsubscribe = subscribePosts(
      (fps: FirestorePost[]) => {
        const mapped: Post[] = fps.map(fp => {
          const {time, hoursAgo} = formatTimestamp(fp.createdAt);
          const authorHandle = fp.authorName
            ? fp.authorName.replace(/\s+/g, '_').toLowerCase()
            : 'anonymous';
          return {
            id: fp.id,
            communityId: fp.communityId || 'technology',
            author: 'u/' + authorHandle,
            authorId: fp.authorId,
            authorPhotoUrl: fp.authorPhotoUrl,
            time,
            hoursAgo,
            title: fp.title || (fp.text ? fp.text.slice(0, 60) : 'Untitled'),
            body: fp.text || '',
            score: fp.likeCount || 1,
            commentCount: 0,
            myVote: 0,
            imageUrl: fp.imageUrl,
            videoUrl: fp.videoUrl,
            linkUrl: fp.linkUrl,
            comments: [],
            createdAt: fp.createdAt,
          };
        });
        setFirestorePosts(mapped);
      },
      err => {
        console.warn('Failed to listen to firestore posts:', err);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Combined posts list: Firestore posts first, then mock posts that don't collide
  const posts = useMemo(() => {
    if (firestorePosts.length === 0) {
      return localPosts;
    }
    const firestoreIds = new Set(firestorePosts.map(p => p.id));
    const nonCollidingLocal = localPosts.filter(p => !firestoreIds.has(p.id));
    return [...firestorePosts, ...nonCollidingLocal];
  }, [firestorePosts, localPosts]);

  const signedIn = !!user || guestSignedIn;

  // Resolve user display name
  const userName = useMemo(() => {
    if (customUserName) {
      return customUserName;
    }
    if (user?.displayName) {
      return user.displayName.replace(/\s+/g, '_').toLowerCase();
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return USER_NAME;
  }, [user, customUserName]);

  const userPhoto = customUserPhoto ?? (user?.photoURL ?? null);

  const updateProfile = useCallback(
    async (newName: string, newPhoto?: string) => {
      const cleanName = newName
        .trim()
        .replace(/^u\//, '')
        .replace(/\s+/g, '_')
        .toLowerCase();
      const photo = newPhoto?.trim() || null;
      if (cleanName) {
        setCustomUserName(cleanName);
      }
      setCustomUserPhoto(photo);

      // Update author on any posts authored by previous handle
      const oldHandle = 'u/' + userName;
      const newHandle = 'u/' + (cleanName || userName);
      const postUpdater = (prev: Post[]) =>
        prev.map(p =>
          p.author === oldHandle
            ? {
                ...p,
                author: newHandle,
                authorPhotoUrl: photo || p.authorPhotoUrl,
              }
            : p,
        );
      setLocalPosts(postUpdater);
      setFirestorePosts(postUpdater);
    },
    [userName],
  );

  // Guest sign in
  const signIn = useCallback(() => {
    setGuestSignedIn(true);
  }, []);

  // Google sign in via Firebase
  const signInWithGoogle = useCallback(async () => {
    await authSignInWithGoogle();
  }, []);

  // Universal sign out
  const signOut = useCallback(async () => {
    setGuestSignedIn(false);
    await signOutEverywhere();
  }, []);

  /** Check if current user can edit a post (only author) */
  const canEditPost = useCallback(
    (post: Post) => {
      if (user && post.authorId && post.authorId === user.uid) {
        return true;
      }
      return post.author === 'u/' + userName;
    },
    [user, userName],
  );

  /** Check if current user can delete a post (author or admin) */
  const canDeletePost = useCallback(
    (post: Post) => {
      if (isAdmin) {
        return true;
      }
      if (user && post.authorId && post.authorId === user.uid) {
        return true;
      }
      return post.author === 'u/' + userName;
    },
    [user, userName, isAdmin],
  );

  /** Reddit-style vote toggle: tap to vote, tap again to remove the vote. */
  const toggleVote = useCallback(
    (postId: string, dir: 1 | -1) => {
      // Find current vote
      const current = posts.find(p => p.id === postId);
      const isUpvoting = current ? current.myVote !== dir && dir === 1 : dir === 1;

      // Update Firestore if it's a Firestore post
      if (current?.authorId) {
        firestoreToggleLike(postId, isUpvoting).catch(err => {
          console.warn('Failed to update like in Firestore:', err);
        });
      }

      const updater = (prev: Post[]) =>
        prev.map(p => {
          if (p.id !== postId) {
            return p;
          }
          const next: MyVote = p.myVote === dir ? 0 : dir;
          return {...p, myVote: next};
        });

      setLocalPosts(updater);
      setFirestorePosts(updater);
    },
    [posts],
  );

  /** Add post - persists to Firestore and updates local state */
  const addPost = useCallback(
    async (
      communityId: string,
      title: string,
      body: string,
      media?: MediaAttachment,
    ): Promise<Post> => {
      let createdId = 'p' + Date.now();

      if (user) {
        try {
          createdId = await firestoreCreatePost(title, body, communityId, media);
        } catch (err) {
          console.warn('Firestore createPost error (falling back locally):', err);
        }
      }

      const post: Post = {
        id: createdId,
        communityId,
        author: 'u/' + userName,
        authorId: user?.uid,
        authorPhotoUrl: user?.photoURL ?? undefined,
        time: 'just now',
        hoursAgo: 0,
        title,
        body,
        score: 1,
        commentCount: 0,
        myVote: 1, // Reddit auto-upvotes your own post
        comments: [],
        imageUrl: media?.imageUrl,
        videoUrl: media?.videoUrl,
        linkUrl: media?.linkUrl,
      };

      setLocalPosts(prev => [post, ...prev]);
      return post;
    },
    [user, userName],
  );

  /** Edit post - persists to Firestore and updates local state */
  const editPost = useCallback(
    async (
      postId: string,
      updates: {
        title?: string;
        body?: string;
        imageUrl?: string;
        videoUrl?: string;
        linkUrl?: string;
      },
    ): Promise<void> => {
      if (user) {
        try {
          await firestoreEditPost(postId, {
            title: updates.title,
            text: updates.body,
            imageUrl: updates.imageUrl,
            videoUrl: updates.videoUrl,
            linkUrl: updates.linkUrl,
          });
        } catch (err) {
          console.warn('Firestore editPost error:', err);
        }
      }

      const updater = (prev: Post[]) =>
        prev.map(p => {
          if (p.id !== postId) {
            return p;
          }
          return {
            ...p,
            title: updates.title ?? p.title,
            body: updates.body ?? p.body,
            imageUrl: updates.imageUrl !== undefined ? updates.imageUrl : p.imageUrl,
            videoUrl: updates.videoUrl !== undefined ? updates.videoUrl : p.videoUrl,
            linkUrl: updates.linkUrl !== undefined ? updates.linkUrl : p.linkUrl,
          };
        });

      setLocalPosts(updater);
      setFirestorePosts(updater);
    },
    [user],
  );

  /** Delete post - removes from Firestore and local state */
  const deletePost = useCallback(
    async (postId: string): Promise<void> => {
      if (user) {
        try {
          await firestoreDeletePost(postId);
        } catch (err) {
          console.warn('Firestore deletePost error:', err);
        }
      }

      setLocalPosts(prev => prev.filter(p => p.id !== postId));
      setFirestorePosts(prev => prev.filter(p => p.id !== postId));
    },
    [user],
  );

  const addComment = useCallback(
    (postId: string, body: string) => {
      const comment: Comment = {
        id: 'c' + Date.now(),
        author: 'u/' + userName,
        time: 'just now',
        body,
        score: 1,
      };

      const updater = (prev: Post[]) =>
        prev.map(p => {
          if (p.id !== postId) {
            return p;
          }
          const nextComments = [...(p.comments ?? []), comment];
          return {
            ...p,
            commentCount: nextComments.length,
            comments: nextComments,
          };
        });

      setLocalPosts(updater);
      setFirestorePosts(updater);
    },
    [userName],
  );

  const value = useMemo(
    () => ({
      user,
      signedIn,
      isAdmin,
      userName,
      userPhoto,
      loadingAuth,
      posts,
      signIn,
      signInWithGoogle,
      signOut,
      toggleVote,
      addPost,
      editPost,
      deletePost,
      canEditPost,
      canDeletePost,
      addComment,
      updateProfile,
    }),
    [
      user,
      signedIn,
      isAdmin,
      userName,
      userPhoto,
      loadingAuth,
      posts,
      signIn,
      signInWithGoogle,
      signOut,
      toggleVote,
      addPost,
      editPost,
      deletePost,
      canEditPost,
      canDeletePost,
      addComment,
      updateProfile,
    ],
  );

  return <PostsContext.Provider value={value}>{children}</PostsContext.Provider>;
}

export function usePosts(): PostsContextValue {
  const ctx = useContext(PostsContext);
  if (!ctx) {
    throw new Error('usePosts must be used inside <PostsProvider>');
  }
  return ctx;
}
