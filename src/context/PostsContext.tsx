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

type PostsContextValue = {
  user: User | null;
  signedIn: boolean;
  userName: string;
  userPhoto: string | null;
  loadingAuth: boolean;
  posts: Post[];
  signIn: () => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  toggleVote: (postId: string, dir: 1 | -1) => void;
  addPost: (communityId: string, title: string, body: string) => Post;
  addComment: (postId: string, body: string) => void;
};

const PostsContext = createContext<PostsContextValue | null>(null);

export function PostsProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = useState<User | null>(null);
  const [guestSignedIn, setGuestSignedIn] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [posts, setPosts] = useState<Post[]>(POSTS);

  // Subscribe to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return unsubscribe;
  }, []);

  const signedIn = !!user || guestSignedIn;

  // Resolve user display name
  const userName = useMemo(() => {
    if (user?.displayName) {
      return user.displayName.replace(/\s+/g, '_').toLowerCase();
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return USER_NAME;
  }, [user]);

  const userPhoto = user?.photoURL ?? null;

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

  /** Reddit-style vote toggle: tap to vote, tap again to remove the vote. */
  const toggleVote = useCallback((postId: string, dir: 1 | -1) => {
    setPosts(prev =>
      prev.map(p => {
        if (p.id !== postId) {
          return p;
        }
        const next: MyVote = p.myVote === dir ? 0 : dir;
        return {...p, myVote: next};
      }),
    );
  }, []);

  const addPost = useCallback(
    (communityId: string, title: string, body: string): Post => {
      const post: Post = {
        id: 'p' + Date.now(),
        communityId,
        author: 'u/' + userName,
        time: 'just now',
        hoursAgo: 0,
        title,
        body,
        score: 1,
        commentCount: 0,
        myVote: 1, // Reddit auto-upvotes your own post
        comments: [],
      };
      setPosts(prev => [post, ...prev]);
      return post;
    },
    [userName],
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
      setPosts(prev =>
        prev.map(p => {
          if (p.id !== postId) {
            return p;
          }
          return {
            ...p,
            commentCount: p.commentCount + 1,
            comments: [...(p.comments ?? []), comment],
          };
        }),
      );
    },
    [userName],
  );

  const value = useMemo(
    () => ({
      user,
      signedIn,
      userName,
      userPhoto,
      loadingAuth,
      posts,
      signIn,
      signInWithGoogle,
      signOut,
      toggleVote,
      addPost,
      addComment,
    }),
    [
      user,
      signedIn,
      userName,
      userPhoto,
      loadingAuth,
      posts,
      signIn,
      signInWithGoogle,
      signOut,
      toggleVote,
      addPost,
      addComment,
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
