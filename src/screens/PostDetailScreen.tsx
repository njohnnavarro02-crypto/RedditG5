import React, {useState} from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Share,
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

/** Post detail: full post, vote pills, comment list, comment composer, and full CRUD. */
export default function PostDetailScreen({route, navigation}: Props) {
  const {postId} = route.params;
  const {
    posts,
    toggleVote,
    addComment,
    userName,
    canEditPost,
    canDeletePost,
    editPost,
    deletePost,
  } = usePosts();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');

  // Menu and Edit Modal states
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editVideo, setEditVideo] = useState('');
  const [editLink, setEditLink] = useState('');
  const [saving, setSaving] = useState(false);

  const post = posts.find(p => p.id === postId);
  if (!post) {
    return (
      <View style={[styles.screen, {paddingTop: insets.top + 20, alignItems: 'center'}]}>
        <Text style={styles.notFoundText}>Post no longer exists.</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const mine = canEditPost(post);
  const canDelete = canDeletePost(post);

  const comments: Comment[] = post.comments || [];

  const submit = () => {
    const body = draft.trim();
    if (!body) {
      return;
    }
    addComment(postId, body);
    setDraft('');
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: post.title,
        message: `${post.title}\n\n${post.body || ''}\n${post.linkUrl || ''}`,
      });
    } catch {
      // Ignored
    }
  };

  const handleDelete = () => {
    setShowMenu(false);
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePost(post.id);
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete post.');
            }
          },
        },
      ],
    );
  };

  const handleOpenEdit = () => {
    setShowMenu(false);
    setEditTitle(post.title);
    setEditBody(post.body);
    setEditImage(post.imageUrl ?? '');
    setEditVideo(post.videoUrl ?? '');
    setEditLink(post.linkUrl ?? '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      Alert.alert('Validation Error', 'Title cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      await editPost(post.id, {
        title: editTitle.trim(),
        body: editBody.trim(),
        imageUrl: editImage.trim() || undefined,
        videoUrl: editVideo.trim() || undefined,
        linkUrl: editLink.trim() || undefined,
      });
      setIsEditing(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update post.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenUrl = (url?: string) => {
    if (!url) return;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Invalid URL', `Cannot open ${url}`);
      }
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Screen Header */}
      <View style={[styles.header, {paddingTop: insets.top + 6}]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Icon name="back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          r/{post.communityId}
        </Text>
        {/* Clickable 3-dots Menu Button */}
        <TouchableOpacity
          onPress={() => setShowMenu(true)}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Icon name="dots" size={22} color={C.text} />
        </TouchableOpacity>
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

            {/* Attached Photo */}
            {!!post.imageUrl && (
              <View style={styles.mediaWrap}>
                <Image
                  source={{uri: post.imageUrl}}
                  style={styles.postImage}
                  resizeMode="cover"
                />
              </View>
            )}

            {/* Attached Video */}
            {!!post.videoUrl && (
              <TouchableOpacity
                style={styles.mediaPill}
                activeOpacity={0.8}
                onPress={() => handleOpenUrl(post.videoUrl)}>
                <Icon name="sparkle" size={14} color={C.orange} />
                <Text style={styles.mediaPillText} numberOfLines={1}>
                  Watch video: {post.videoUrl}
                </Text>
              </TouchableOpacity>
            )}

            {/* Attached Link */}
            {!!post.linkUrl && (
              <TouchableOpacity
                style={styles.mediaPill}
                activeOpacity={0.8}
                onPress={() => handleOpenUrl(post.linkUrl)}>
                <Icon name="link" size={14} color={C.blue} />
                <Text style={[styles.mediaPillText, styles.linkText]} numberOfLines={1}>
                  {post.linkUrl}
                </Text>
              </TouchableOpacity>
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
                <Text style={styles.pillText}>{fmt(comments.length)}</Text>
              </View>
              <TouchableOpacity
                style={[styles.pill, styles.sharePill]}
                onPress={handleShare}>
                <Icon name="share" size={16} color={C.faint} />
              </TouchableOpacity>
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
        ListEmptyComponent={
          <View style={styles.emptyComments}>
            <Icon name="comment" size={28} color={C.faint} />
            <Text style={styles.emptyCommentsTitle}>No comments yet</Text>
            <Text style={styles.emptyCommentsSub}>
              Be the first to share what you think!
            </Text>
          </View>
        }
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

      {/* Options Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}>
          <View style={styles.menuSheet}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Post Options</Text>
              <TouchableOpacity onPress={() => setShowMenu(false)}>
                <Icon name="close" size={18} color={C.text} />
              </TouchableOpacity>
            </View>

            {mine && (
              <TouchableOpacity style={styles.menuItem} onPress={handleOpenEdit}>
                <Text style={styles.menuItemText}>✏️  Edit Post</Text>
              </TouchableOpacity>
            )}

            {canDelete && (
              <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
                <Text style={[styles.menuItemText, styles.menuDeleteText]}>
                  🗑️  Delete Post
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                handleShare();
              }}>
              <Text style={styles.menuItemText}>📤  Share</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Post Modal */}
      <Modal
        visible={isEditing}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditing(false)}>
        <View style={styles.editOverlay}>
          <View style={styles.editModalContent}>
            <View style={styles.editHeader}>
              <Text style={styles.editHeaderTitle}>Edit Post</Text>
              <TouchableOpacity onPress={() => setIsEditing(false)}>
                <Icon name="close" size={20} color={C.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.editTextInput}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Title"
              placeholderTextColor={C.faint}
            />

            <Text style={styles.inputLabel}>Text / Description</Text>
            <TextInput
              style={[styles.editTextInput, styles.editMultiline]}
              value={editBody}
              onChangeText={setEditBody}
              placeholder="Post text..."
              placeholderTextColor={C.faint}
              multiline
            />

            <Text style={styles.inputLabel}>Image URL (optional)</Text>
            <TextInput
              style={styles.editTextInput}
              value={editImage}
              onChangeText={setEditImage}
              placeholder="https://..."
              placeholderTextColor={C.faint}
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Video URL (optional)</Text>
            <TextInput
              style={styles.editTextInput}
              value={editVideo}
              onChangeText={setEditVideo}
              placeholder="https://..."
              placeholderTextColor={C.faint}
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Web Link URL (optional)</Text>
            <TextInput
              style={styles.editTextInput}
              value={editLink}
              onChangeText={setEditLink}
              placeholder="https://..."
              placeholderTextColor={C.faint}
              autoCapitalize="none"
            />

            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.editCancelBtn}
                onPress={() => setIsEditing(false)}>
                <Text style={styles.editCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editSaveBtn}
                disabled={saving}
                onPress={handleSaveEdit}>
                <Text style={styles.editSaveText}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  notFoundText: {
    fontSize: 16,
    color: C.sub,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: C.orange,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  backBtnText: {
    color: C.white,
    fontWeight: '700',
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
  mediaWrap: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: C.pill,
  },
  postImage: {
    width: '100%',
    height: 220,
  },
  mediaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: C.pill,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  mediaPillText: {
    fontSize: 12,
    color: C.sub,
    flex: 1,
  },
  linkText: {
    color: C.blue,
    textDecorationLine: 'underline',
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
    width: 48,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    paddingBottom: 28,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
    paddingBottom: 8,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  menuItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  menuDeleteText: {
    color: C.danger,
  },
  editOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  editModalContent: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 18,
    maxHeight: '90%',
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  editHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.text,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.sub,
    marginTop: 8,
    marginBottom: 4,
  },
  editTextInput: {
    backgroundColor: C.pill,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: C.text,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  editMultiline: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  editCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  editCancelText: {
    color: C.sub,
    fontWeight: '700',
  },
  editSaveBtn: {
    backgroundColor: C.orange,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
  },
  editSaveText: {
    color: C.white,
    fontWeight: '700',
  },
  emptyComments: {
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCommentsTitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  emptyCommentsSub: {
    marginTop: 4,
    fontSize: 13,
    color: C.faint,
    textAlign: 'center',
  },
});
