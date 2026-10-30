import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {POSTS} from '../data/mock';
import {Comment, MyVote, Post} from '../types';
import {USER_NAME} from '../theme';

type PostsContextValue = {
  signedIn: boolean;
  userName: string;
  posts: Post[];
  signIn: () => void;
  signOut: () => void;
  toggleVote: (postId: string, dir: 1 | -1) => void;
  addPost: (communityId: string, title: string, body: string) => Post;
  addComment: (postId: string, body: string) => void;
};

const PostsContext = createContext<PostsContextValue | null>(null);

export function PostsProvider({children}: {children: React.ReactNode}) {
  const [signedIn, setSignedIn] = useState(false);
  const [posts, setPosts] = useState<Post[]>(POSTS);

  const signIn = useCallback(() => setSignedIn(true), []);
  const signOut = useCallback(() => setSignedIn(false), []);

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
        author: 'u/' + USER_NAME,
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
    [],
  );

  const addComment = useCallback((postId: string, body: string) => {
    const comment: Comment = {
      id: 'c' + Date.now(),
      author: 'u/' + USER_NAME,
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
  }, []);

  const value = useMemo(
    () => ({
      signedIn,
      userName: USER_NAME,
      posts,
      signIn,
      signOut,
      toggleVote,
      addPost,
      addComment,
    }),
    [signedIn, posts, signIn, signOut, toggleVote, addPost, addComment],
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
