import React, {useMemo, useState} from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import PostCard from '../components/PostCard';
import {usePosts} from '../context/PostsContext';
import type {RootStackParamList} from '../navigation/types';
import {C} from '../theme';
import {fmt} from '../utils';

type Segment = 'overview' | 'posts' | 'comments';

const SEGMENTS: {key: Segment; label: string}[] = [
  {key: 'overview', label: 'Overview'},
  {key: 'posts', label: 'Posts'},
  {key: 'comments', label: 'Comments'},
];

/** Profile screen: avatar, dynamic karma starting at 0, tabs for posts/comments, and log out. */
export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const {userName, userPhoto, posts, signOut, user} = usePosts();
  const [segment, setSegment] = useState<Segment>('overview');

  // Filter posts authored by this user
  const myPosts = useMemo(
    () =>
      posts.filter(
        p => (user && p.authorId === user.uid) || p.author === 'u/' + userName,
      ),
    [posts, user, userName],
  );

  // Filter comments authored by this user across all posts
  const myComments = useMemo(() => {
    const list: {
      id: string;
      postId: string;
      communityId: string;
      time: string;
      body: string;
      score: number;
    }[] = [];

    posts.forEach(p => {
      (p.comments || []).forEach(c => {
        if (c.author === 'u/' + userName) {
          list.push({
            id: c.id,
            postId: p.id,
            communityId: p.communityId,
            time: c.time,
            body: c.body,
            score: c.score,
          });
        }
      });
    });

    return list;
  }, [posts, userName]);

  // Dynamic karma starting at 0 for new accounts
  const postKarma = useMemo(() => {
    // If the account has no posts, karma starts at 0
    if (myPosts.length === 0) return 0;
    return myPosts.reduce((acc, p) => acc + Math.max(0, p.score), 0);
  }, [myPosts]);

  const commentKarma = useMemo(() => {
    // If the account has no comments, karma starts at 0
    if (myComments.length === 0) return 0;
    return myComments.reduce((acc, c) => acc + Math.max(0, c.score), 0);
  }, [myComments]);

  // Dynamic cake day
  const cakeDay = useMemo(() => {
    if (user?.metadata?.creationTime) {
      const d = new Date(user.metadata.creationTime);
      return `Cake day: ${d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`;
    }
    return `Cake day: ${new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`;
  }, [user]);

  const showPosts = segment === 'overview' || segment === 'posts';

  return (
    <View style={styles.screen}>
      <View style={[styles.header, {paddingTop: insets.top + 10}]}>
        <Image
          source={userPhoto ? {uri: userPhoto} : require('../assets/reddit-icon.png')}
          style={styles.avatar}
        />
        <Text style={styles.name}>u/{userName}</Text>
        <Text style={styles.cakeDay}>{cakeDay}</Text>
        <View style={styles.karmaRow}>
          <View style={styles.karmaChip}>
            <Text style={styles.karmaText}>Post karma {fmt(postKarma)}</Text>
          </View>
          <View style={styles.karmaChip}>
            <Text style={styles.karmaText}>Comment karma {fmt(commentKarma)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.segments}>
        {SEGMENTS.map(s => {
          const active = s.key === segment;
          return (
            <TouchableOpacity
              key={s.key}
              style={[styles.segment, active && styles.segmentActive]}
              onPress={() => setSegment(s.key)}
              activeOpacity={0.8}>
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={showPosts ? myPosts : []}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          showPosts ? (
            <Text style={styles.empty}>You haven't posted yet. Tap + to create one!</Text>
          ) : undefined
        }
        renderItem={({item}) => <PostCard post={item} />}
        ListFooterComponent={
          !showPosts ? (
            <View style={styles.commentsWrap}>
              {myComments.length === 0 ? (
                <Text style={styles.empty}>You haven't commented on any posts yet.</Text>
              ) : (
                myComments.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.commentRow}
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate('PostDetail', {postId: c.postId})}>
                    <Text style={styles.commentMeta}>
                      r/{c.communityId} • {c.time}
                    </Text>
                    <Text style={styles.commentBody}>{c.body}</Text>
                    <Text style={styles.commentScore}>{fmt(c.score)} points</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          ) : (
            <View style={styles.logoutWrap}>
              <TouchableOpacity style={styles.logoutBtn} onPress={signOut} activeOpacity={0.8}>
                <Text style={styles.logoutText}>Log out</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    alignItems: 'center',
    backgroundColor: C.white,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  name: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
  },
  cakeDay: {
    marginTop: 2,
    fontSize: 12,
    color: C.sub,
  },
  karmaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  karmaChip: {
    backgroundColor: C.pill,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  karmaText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.text,
  },
  segments: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  segmentActive: {
    borderBottomColor: C.orange,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.sub,
  },
  segmentTextActive: {
    color: C.text,
  },
  list: {
    paddingBottom: 24,
  },
  empty: {
    textAlign: 'center',
    color: C.sub,
    fontSize: 13,
    marginTop: 32,
  },
  commentsWrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  commentRow: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.hairline,
    padding: 12,
    marginBottom: 8,
  },
  commentMeta: {
    fontSize: 11,
    color: C.sub,
  },
  commentBody: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 19,
    color: C.text,
  },
  commentScore: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: C.sub,
  },
  logoutWrap: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  logoutBtn: {
    height: 46,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#F3B9B9',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.white,
  },
  logoutText: {
    color: C.danger,
    fontWeight: '700',
    fontSize: 14,
  },
});
