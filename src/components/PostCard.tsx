import React, {useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import CommunityAvatar from './CommunityAvatar';
import Icon from './Icon';
import JoinButton from './JoinButton';
import VotePill from './VotePill';
import {usePosts} from '../context/PostsContext';
import type {RootStackParamList} from '../navigation/types';
import {C, USER_NAME} from '../theme';
import {Post} from '../types';
import {fmt, scoreOf} from '../utils';

type Props = {
  post: Post;
  /** Set false to hide the r/ prefix (already inside a community). */
  showCommunity?: boolean;
};

/** Reddit-style feed post card: header row, title, body preview, action pills. */
export default function PostCard({post, showCommunity = true}: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {toggleVote} = usePosts();
  const [joined, setJoined] = useState(false);
  const mine = post.author === 'u/' + USER_NAME;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.card}
      onPress={() => navigation.navigate('PostDetail', {postId: post.id})}>
      <View style={styles.topRow}>
        <CommunityAvatar communityId={post.communityId} size={30} />
        <Text style={styles.meta} numberOfLines={1}>
          {showCommunity && <Text style={styles.community}>r/{post.communityId}</Text>}
          <Text style={styles.metaDim}>
            {showCommunity ? ' • ' : ''}
            {post.author} • {post.time}
          </Text>
        </Text>
        {!mine && (
          <View style={styles.joinWrap}>
            <JoinButton small joined={joined} onPress={() => setJoined(j => !j)} />
          </View>
        )}
      </View>

      <Text style={styles.title}>{post.title}</Text>
      {!!post.body && (
        <Text style={styles.body} numberOfLines={3}>
          {post.body}
        </Text>
      )}

      <View style={styles.actions}>
        <VotePill
          score={scoreOf(post)}
          myVote={post.myVote}
          onUp={() => toggleVote(post.id, 1)}
          onDown={() => toggleVote(post.id, -1)}
        />
        <View style={styles.pill}>
          <Icon name="comment" size={16} color={C.faint} />
          <Text style={styles.pillText}>{fmt(post.commentCount)}</Text>
        </View>
        <View style={[styles.pill, styles.sharePill]}>
          <Icon name="share" size={16} color={C.faint} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.hairline,
    padding: 12,
    marginHorizontal: 12,
    marginVertical: 5,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  meta: {
    flex: 1,
    fontSize: 12,
    color: C.sub,
  },
  community: {
    fontSize: 13,
    fontWeight: '700',
    color: C.text,
  },
  metaDim: {
    fontSize: 12,
    color: C.sub,
  },
  joinWrap: {
    marginLeft: 'auto',
  },
  title: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    lineHeight: 21,
  },
  body: {
    marginTop: 4,
    fontSize: 14,
    color: C.sub,
    lineHeight: 19,
  },
  actions: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.pill,
    borderRadius: 999,
    paddingHorizontal: 12,
    height: 32,
    gap: 6,
  },
  sharePill: {
    marginLeft: 'auto',
    width: 64,
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.sub,
  },
});
