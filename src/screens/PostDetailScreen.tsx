import React, {useState} from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import CommunityAvatar from '../components/CommunityAvatar';
import Icon from '../components/Icon';
import VotePill from '../components/VotePill';
import {usePosts} from '../context/PostsContext';
import {DEFAULT_COMMENTS} from '../data/mock';
import type {RootStackParamList} from '../navigation/types';
import {C} from '../theme';
import {Comment} from '../types';
import {fmt, scoreOf} from '../utils';

type Props = NativeStackScreenProps<RootStackParamList, 'PostDetail'>;

/** Post detail: full post, vote pills, comment list, and comment composer. */
export default function PostDetailScreen({route, navigation}: Props) {
  const {postId} = route.params;
  const {posts, toggleVote, addComment, userName} = usePosts();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');

  const post = posts.find(p => p.id === postId);
  if (!post) {
    return <View style={styles.screen} />;
  }

  const comments: Comment[] = post.comments?.length
    ? post.comments
    : DEFAULT_COMMENTS.map(c => ({...c}));

  const submit = () => {
    const body = draft.trim();
    if (!body) {
      return;
    }
    addComment(postId, body);
    setDraft('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, {paddingTop: insets.top + 6}]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Icon name="back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          r/{post.communityId}
        </Text>
        <Icon name="dots" size={22} color={C.text} />
      </View>

      <FlatList
        data={comments}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.post}>
            <View style={styles.topRow}>
              <CommunityAvatar communityId={post.communityId} size={26} />
              <Text style={styles.meta}>
                r/{post.communityId} • {post.author} • {post.time}
              </Text>
            </View>
            <Text style={styles.title}>{post.title}</Text>
            {!!post.body && <Text style={styles.body}>{post.body}</Text>}
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

            <View style={styles.sortRow}>
              <Icon name="sort" size={14} color={C.faint} />
              <Text style={styles.sortText}>Sort by: Best</Text>
            </View>
          </View>
        }
        renderItem={({item}) => (
          <View style={styles.comment}>
            <Text style={styles.commentMeta}>
              {item.author} • {item.time}
            </Text>
            <Text style={styles.commentBody}>{item.body}</Text>
            <View style={styles.commentActions}>
              <Icon name="up" size={13} color={C.faint} />
              <Text style={styles.commentScore}>{fmt(item.score)}</Text>
              <Icon name="down" size={13} color={C.faint} />
              <Text style={styles.reply}>Reply</Text>
            </View>
          </View>
        )}
      />

      <View style={[styles.composer, {paddingBottom: Math.max(insets.bottom, 8) + 4}]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Add a comment"
          placeholderTextColor={C.faint}
          style={styles.composerInput}
          onSubmitEditing={submit}
        />
        <TouchableOpacity
          onPress={submit}
          disabled={!draft.trim()}
          activeOpacity={0.8}>
          <Text style={[styles.composerBtn, !draft.trim() && styles.composerBtnDisabled]}>
            Comment
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.signedAs}>Commenting as u/{userName}</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.white,
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 10,
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    textAlign: 'center',
  },
  list: {
    paddingBottom: 16,
  },
  post: {
    backgroundColor: C.card,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
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
  title: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
    color: C.text,
  },
  body: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 21,
    color: C.text,
  },
  actions: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
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
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
  },
  sortText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.faint,
  },
  comment: {
    backgroundColor: C.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
  },
  commentMeta: {
    fontSize: 11,
    color: C.sub,
  },
  commentBody: {
    marginTop: 3,
    fontSize: 14,
    lineHeight: 19,
    color: C.text,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  commentScore: {
    fontSize: 11,
    fontWeight: '600',
    color: C.sub,
    marginHorizontal: 2,
  },
  reply: {
    marginLeft: 12,
    fontSize: 11,
    fontWeight: '700',
    color: C.faint,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
    backgroundColor: C.white,
  },
  composerInput: {
    flex: 1,
    backgroundColor: C.pill,
    borderRadius: 999,
    paddingHorizontal: 14,
    height: 40,
    fontSize: 14,
    color: C.text,
  },
  composerBtn: {
    color: C.orange,
    fontWeight: '800',
    fontSize: 14,
  },
  composerBtnDisabled: {
    color: C.faint,
  },
  signedAs: {
    backgroundColor: C.white,
    textAlign: 'center',
    fontSize: 10,
    color: C.faint,
    paddingBottom: 4,
  },
});
