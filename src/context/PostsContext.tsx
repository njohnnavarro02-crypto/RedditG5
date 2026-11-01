import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Comment, MyVote, Post} from '../types';
import {USER_NAME} from '../theme';
import {
  auth,
  onAuthStateChanged,
  signInWithGoogle as authSignInWithGoogle,
  signOutEverywhere,
  firebaseUpdateProfile,
  User,
} from '../services/firebase';
import {
  createPost as firestoreCreatePost,
  editPost as firestoreEditPost,
  deletePost as firestoreDeletePost,
  toggleLike as firestoreToggleLike,
  updatePostVoteScore,
  subscribePosts,
  isCurrentUserAdmin,
  getUserProfile,
  upsertUserProfile,
  FirestorePost,
  updateUserPostsProfile,
  subscribeUserProfiles,
  addFirestoreComment,
  subscribeFirestoreComments,
  toggleJoinCommunity,
  subscribeJoinedCommunities,
  castFirestoreVote,
  subscribeUserVotes,
  castFirestoreCommentVote,
  updateCommentVoteScore,
  FirestoreComment,
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
  toggleCommentVote: (postId: string, commentId: string, dir: 1 | -1) => void;
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
  addComment: (postId: string, body: string, replyTo?: {id: string; author: string}) => Promise<void>;
  updateProfile: (newName: string, newPhoto?: string) => Promise<void>;
  joinedCommunities: Set<string>;
  toggleJoin: (communityId: string) => Promise<void>;
  isJoined: (communityId: string) => boolean;
};

const PostsContext = createContext<PostsContextValue | null>(null);

export function PostsProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [guestSignedIn, setGuestSignedIn] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [firestorePosts, setFirestorePosts] = useState<Post[]>([]);
  const [customUserName, setCustomUserName] = useState<string | null>(null);
  const [customUserPhoto, setCustomUserPhoto] = useState<string | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});
  const [userProfiles, setUserProfiles] = useState<Record<string, {displayName?: string; photoURL?: string}>>({});
  const [joinedCommunities, setJoinedCommunities] = useState<Set<string>>(new Set());
  const [userVotes, setUserVotes] = useState<Record<string, 1 | -1 | 0>>({});
  const prevUidRef = useRef<string | undefined>(undefined);

  // Real-time listener for joined communities in Firestore
  useEffect(() => {
    if (!user) {
      setJoinedCommunities(new Set());
      return;
    }
    const unsub = subscribeJoinedCommunities(user.uid, ids => {
      setJoinedCommunities(new Set(ids));
    });
    return unsub;
  }, [user]);

  // Real-time listeners for comments on all active Firestore posts
  useEffect(() => {
    if (firestorePosts.length === 0) return;

    const unsubs: (() => void)[] = [];
    firestorePosts.forEach(fp => {
      const unsub = subscribeFirestoreComments(fp.id, (fComments: FirestoreComment[]) => {
        if (fComments.length === 0) return;
        const mappedComments: Comment[] = fComments.map(fc => {
          const {time} = formatTimestamp(fc.createdAt);
          return {
            id: fc.id,
            author: 'u/' + (fc.authorName || 'anonymous').replace(/\s+/g, '_').toLowerCase(),
            authorId: fc.authorId,
            time,
            body: fc.body,
            score: fc.score || 0,
            replyToId: fc.replyToId,
            replyToAuthor: fc.replyToAuthor,
          };
        });

        setCommentsByPost(prev => ({
          ...prev,
          [fp.id]: mappedComments,
        }));
      });
      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach(u => u());
    };
  }, [firestorePosts]);

  // Real-time listeners for user's votes on all posts
  useEffect(() => {
    if (!user || firestorePosts.length === 0) {
      setUserVotes({});
      return;
    }

    const unsubs: (() => void)[] = [];
    firestorePosts.forEach(fp => {
      const unsub = subscribeUserVotes(fp.id, user.uid, (vote: 1 | -1 | 0) => {
        setUserVotes(prev => {
          if (prev[fp.id] === vote) return prev;
          return {...prev, [fp.id]: vote};
        });
      });
      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach(u => u());
    };
  }, [user, firestorePosts.length]);

  // Listen to all user profiles in real time so other users' name/avatar changes appear instantly
  useEffect(() => {
    if (!user) {
      setUserProfiles({});
      return;
    }
    const unsubscribe = subscribeUserProfiles(profiles => {
      setUserProfiles(profiles);
    });
    return () => {
      unsubscribe();
    };
  }, [user]);

  // Subscribe to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async currentUser => {
      const currentUid = currentUser?.uid ?? null;
      const isSwitch = prevUidRef.current !== undefined && prevUidRef.current !== currentUid;
      prevUidRef.current = currentUid ?? undefined;

      setUser(currentUser);
      setLoadingAuth(false);

      if (isSwitch) {
        // Reset custom state only on actual switch/logout
        setCustomUserName(null);
        setCustomUserPhoto(null);
      }

      if (currentUser) {
        const storageKey = `@user_profile_${currentUser.uid}`;
        try {
          const cached = await AsyncStorage.getItem(storageKey);
          if (cached) {
            const data = JSON.parse(cached);
            if (data.displayName) {
              setCustomUserName(data.displayName);
            }
            if (data.photoURL) {
              setCustomUserPhoto(data.photoURL);
            }
          }
        } catch {}

        try {
          const [adminStatus, firestoreProfile] = await Promise.all([
            isCurrentUserAdmin(),
            getUserProfile(currentUser.uid),
          ]);
          setIsAdmin(adminStatus);
          if (firestoreProfile) {
            if (firestoreProfile.displayName) {
              setCustomUserName(
                firestoreProfile.displayName.replace(/\s+/g, '_').toLowerCase(),
              );
            }
            if (firestoreProfile.photoURL) {
              setCustomUserPhoto(firestoreProfile.photoURL);
            }
          }
        } catch {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
        try {
          const cached = await AsyncStorage.getItem('@user_profile_guest');
          if (cached) {
            const data = JSON.parse(cached);
            if (data.displayName) {
              setCustomUserName(data.displayName);
            }
            if (data.photoURL) {
              setCustomUserPhoto(data.photoURL);
            }
          }
        } catch {}
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
          const postComments = commentsByPost[fp.id] || [];
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
            score: fp.likeCount ?? 0,
            commentCount: postComments.length,
            myVote: (userVotes[fp.id] as MyVote) || 0,
            imageUrl: fp.imageUrl,
            videoUrl: fp.videoUrl,
            linkUrl: fp.linkUrl,
            comments: postComments,
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
  }, [user, commentsByPost]);

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

  // 100% Live Firestore posts - no hardcoded mock posts
  const posts = useMemo(() => {
    return firestorePosts.map(p => {
      const isMine = user
        ? p.authorId === user.uid
        : !p.authorId && (p.author === 'u/' + userName || p.author === 'u/' + USER_NAME);

      // Resolve author name & photo dynamically from real-time user profiles
      const authorProfile = p.authorId ? userProfiles[p.authorId] : null;
      let resolvedAuthor = p.author;
      let resolvedPhoto = p.authorPhotoUrl;

      if (isMine) {
        resolvedAuthor = 'u/' + userName;
        resolvedPhoto = userPhoto ?? p.authorPhotoUrl;
      } else if (authorProfile?.displayName) {
        resolvedAuthor = 'u/' + authorProfile.displayName.replace(/\s+/g, '_').toLowerCase();
        resolvedPhoto = authorProfile.photoURL ?? p.authorPhotoUrl;
      }

      const postComments = (commentsByPost[p.id] || p.comments || []).map(c => {
        const commentAuthorProfile = c.authorId ? userProfiles[c.authorId] : null;
        if (c.authorId && user && c.authorId === user.uid) {
          return {
            ...c,
            author: 'u/' + userName,
          };
        }
        if (commentAuthorProfile?.displayName) {
          return {
            ...c,
            author: 'u/' + commentAuthorProfile.displayName.replace(/\s+/g, '_').toLowerCase(),
          };
        }
        return c;
      });

      return {
        ...p,
        author: resolvedAuthor,
        authorPhotoUrl: resolvedPhoto,
        comments: postComments,
        commentCount: postComments.length,
        myVote: userVotes[p.id] !== undefined ? userVotes[p.id] : p.myVote,
      };
    });
  }, [firestorePosts, commentsByPost, user, userName, userPhoto, userProfiles, userVotes]);

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

      // Persist to local AsyncStorage immediately so changes survive any reload
      const storageKey = `@user_profile_${user?.uid || 'guest'}`;
      AsyncStorage.setItem(
        storageKey,
        JSON.stringify({
          displayName: cleanName || userName,
          photoURL: photo,
        }),
      ).catch(() => {});

      if (user) {
        try {
          await firebaseUpdateProfile(user, {
            displayName: cleanName || userName,
            photoURL: photo || user.photoURL || undefined,
          });
        } catch (authErr) {
          console.warn('Failed to update firebase auth profile:', authErr);
        }

        try {
          await upsertUserProfile(user.uid, {
            displayName: cleanName || userName,
            email: user.email ?? '',
            photoURL: photo || user.photoURL || '',
          });
        } catch (err) {
          console.warn('Failed to persist profile to Firestore:', err);
        }

        setUserProfiles(prev => ({
          ...prev,
          [user.uid]: {
            displayName: cleanName || userName,
            photoURL: photo || user.photoURL || undefined,
          },
        }));

        // Also update existing posts in Firestore so future queries and other clients receive it in real-time
        try {
          await updateUserPostsProfile(user.uid, cleanName || userName, photo || undefined);
        } catch (e) {
          console.warn('Failed to update posts author in Firestore:', e);
        }
      }

      // Update author ONLY on posts authored by THIS user
      const newHandle = 'u/' + (cleanName || userName);
      const postUpdater = (prev: Post[]) =>
        prev.map(p => {
          const isMine = user
            ? p.authorId === user.uid
            : !p.authorId && (p.author === 'u/' + userName || p.author === 'u/' + USER_NAME);
          return isMine
            ? {
                ...p,
                author: newHandle,
                authorPhotoUrl: photo || p.authorPhotoUrl,
              }
            : p;
        });
      setFirestorePosts(postUpdater);

      // Update author on any comments authored by THIS user
      setCommentsByPost(prev => {
        let changed = false;
        const updated: Record<string, Comment[]> = {};
        for (const [pId, cList] of Object.entries(prev)) {
          const nextList = cList.map(c => {
            const isMyComment = user
              ? c.authorId === user.uid
              : c.author === 'u/' + userName;
            if (isMyComment) {
              changed = true;
              return {...c, author: newHandle};
            }
            return c;
          });
          updated[pId] = nextList;
        }
        if (changed) {
          AsyncStorage.setItem('@reddit_comments_by_post', JSON.stringify(updated)).catch(() => {});
          return updated;
        }
        return prev;
      });
    },
    [user, userName],
  );

  // Guest sign in
  const signIn = useCallback(() => {
    setCustomUserName(null);
    setCustomUserPhoto(null);
    setGuestSignedIn(true);
  }, []);

  // Google sign in via Firebase
  const signInWithGoogle = useCallback(async () => {
    await authSignInWithGoogle();
  }, []);

  // Universal sign out
  const signOut = useCallback(async () => {
    setGuestSignedIn(false);
    setCustomUserName(null);
    setCustomUserPhoto(null);
    await signOutEverywhere();
  }, []);

  /** Check if current user can edit a post (only author) */
  const canEditPost = useCallback(
    (post: Post) => {
      if (user) {
        return !!post.authorId && post.authorId === user.uid;
      }
      return !post.authorId && post.author === 'u/' + userName;
    },
    [user, userName],
  );

  /** Check if current user can delete a post (author or admin) */
  const canDeletePost = useCallback(
    (post: Post) => {
      if (isAdmin) {
        return true;
      }
      if (user) {
        return !!post.authorId && post.authorId === user.uid;
      }
      return !post.authorId && post.author === 'u/' + userName;
    },
    [user, userName, isAdmin],
  );

  /** Reddit-style vote toggle: tap to vote, tap again to remove the vote. */
  const toggleVote = useCallback(
    (postId: string, dir: 1 | -1) => {
      // Find current vote
      const current = posts.find(p => p.id === postId);
      const prevVote = current?.myVote || 0;
      const nextVote: MyVote = prevVote === dir ? 0 : dir;
      const delta = nextVote - prevVote;

      setUserVotes(prev => ({
        ...prev,
        [postId]: nextVote,
      }));

      // Update Firestore if it's a Firestore post
      if (current?.authorId && user) {
        castFirestoreVote(postId, nextVote).catch(() => {});
        updatePostVoteScore(postId, delta).catch(err => {
          console.warn('Failed to update score in Firestore:', err);
        });
      }

      const updater = (prev: Post[]) =>
        prev.map(p => {
          if (p.id !== postId) {
            return p;
          }
          return {...p, myVote: nextVote, score: p.score + delta};
        });

      setFirestorePosts(updater);
    },
    [posts, user],
  );

  /** Reddit-style comment vote toggle: upvote / downvote on comments */
  const toggleCommentVote = useCallback(
    (postId: string, commentId: string, dir: 1 | -1) => {
      setCommentsByPost(prev => {
        const postComments = prev[postId] || [];
        const current = postComments.find(c => c.id === commentId);
        if (!current) return prev;

        const prevVote = current.myVote || 0;
        const nextVote: MyVote = prevVote === dir ? 0 : dir;
        const delta = nextVote - prevVote;

        if (user) {
          castFirestoreCommentVote(postId, commentId, nextVote).catch(() => {});
          updateCommentVoteScore(postId, commentId, delta).catch(() => {});
        }

        const updated = postComments.map(c => {
          if (c.id !== commentId) return c;
          return {
            ...c,
            myVote: nextVote,
            score: c.score + delta,
          };
        });

        return {
          ...prev,
          [postId]: updated,
        };
      });
    },
    [user],
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
          createdId = await firestoreCreatePost(
            title,
            body,
            communityId,
            media,
            userName,
            userPhoto || undefined,
          );
        } catch (err: any) {
          console.warn('Firestore createPost error:', err);
          Alert.alert(
            'Firebase Permission Error',
            'Firestore rejected the post write:\n' +
              (err?.message || 'Missing or insufficient permissions.') +
              '\n\nPlease publish the updated firestore.rules in Firebase Console to enable live database writes.',
          );
          throw err;
        }
      }

      const post: Post = {
        id: createdId,
        communityId,
        author: 'u/' + userName,
        authorId: user?.uid,
        authorPhotoUrl: userPhoto ?? user?.photoURL ?? undefined,
        time: 'just now',
        hoursAgo: 0,
        title,
        body,
        score: 0,
        commentCount: 0,
        myVote: 0,
        comments: [],
        imageUrl: media?.imageUrl,
        videoUrl: media?.videoUrl,
        linkUrl: media?.linkUrl,
      };

      setFirestorePosts(prev => [post, ...prev.filter(p => p.id !== post.id)]);
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

      setFirestorePosts(prev => prev.filter(p => p.id !== postId));
    },
    [user],
  );

  const addComment = useCallback(
    async (postId: string, body: string, replyTo?: {id: string; author: string}) => {
      if (!user) {
        throw new Error('You must be signed in to comment.');
      }

      await addFirestoreComment(
        postId,
        body,
        userName,
        userPhoto || undefined,
        replyTo,
      );
    },
    [userName, user, userPhoto],
  );

  const toggleJoin = useCallback(
    async (communityId: string) => {
      const willJoin = !joinedCommunities.has(communityId);
      setJoinedCommunities(prev => {
        const next = new Set(prev);
        if (willJoin) next.add(communityId);
        else next.delete(communityId);
        return next;
      });

      if (user) {
        try {
          await toggleJoinCommunity(communityId, willJoin);
        } catch (e) {
          console.warn('Firestore toggleJoinCommunity error:', e);
        }
      }
    },
    [joinedCommunities, user],
  );

  const isJoined = useCallback(
    (communityId: string) => joinedCommunities.has(communityId),
    [joinedCommunities],
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
      toggleCommentVote,
      addPost,
      editPost,
      deletePost,
      canEditPost,
      canDeletePost,
      addComment,
      updateProfile,
      joinedCommunities,
      toggleJoin,
      isJoined,
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
      toggleCommentVote,
      addPost,
      editPost,
      deletePost,
      canEditPost,
      canDeletePost,
      addComment,
      updateProfile,
      joinedCommunities,
      toggleJoin,
      isJoined,
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
