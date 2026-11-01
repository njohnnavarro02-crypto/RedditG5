import React, {useState} from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import CommunityAvatar from './CommunityAvatar';
import Icon from './Icon';
import JoinButton from './JoinButton';
import VideoPlayerModal from './VideoPlayerModal';
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

/** Reddit-style feed post card: header row, title, media preview, action pills, CRUD operations. */
export default function PostCard({post, showCommunity = true}: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {toggleVote, canEditPost, canDeletePost, editPost, deletePost, isJoined, toggleJoin} = usePosts();
  const joined = isJoined(post.communityId);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [playingVideo, setPlayingVideo] = useState(false);

  // Edit fields
  const [editTitle, setEditTitle] = useState(post.title);
  const [editBody, setEditBody] = useState(post.body);
  const [editImage, setEditImage] = useState(post.imageUrl ?? '');
  const [editVideo, setEditVideo] = useState(post.videoUrl ?? '');
  const [editLink, setEditLink] = useState(post.linkUrl ?? '');
  const [saving, setSaving] = useState(false);

  const mine = canEditPost(post);
  const canDelete = canDeletePost(post);

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

  const handleOpenUrl = async (url?: string) => {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      try {
        const fullUrl =
          url.startsWith('http://') || url.startsWith('https://')
            ? url
            : `https://${url}`;
        await Linking.openURL(fullUrl);
      } catch (err: any) {
        Alert.alert('Cannot Open Video', 'Unable to play video: ' + (err?.message || url));
      }
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.card}
      onPress={() => navigation.navigate('PostDetail', {postId: post.id})}>
      {/* Top Header Row */}
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
            <JoinButton small joined={joined} onPress={() => toggleJoin(post.communityId)} />
          </View>
        )}

        {/* 3-dots Menu Button */}
        <TouchableOpacity
          onPress={() => setShowMenu(true)}
          style={styles.dotsBtn}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Icon name="dots" size={18} color={C.faint} />
        </TouchableOpacity>
      </View>

      {/* Post Title */}
      <Text style={styles.title}>{post.title}</Text>

      {/* Post Body */}
      {!!post.body && (
        <Text style={styles.body} numberOfLines={3}>
          {post.body}
        </Text>
      )}

      {/* Attached Media: Image */}
      {!!post.imageUrl && (
        <View style={styles.imageContainer}>
          <Image
            source={{uri: post.imageUrl}}
            style={styles.postImage}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Attached Media: Video Card */}
      {!!post.videoUrl && (
        <>
          <TouchableOpacity
            style={styles.videoCard}
            activeOpacity={0.85}
            onPress={() => setPlayingVideo(true)}>
            <View style={styles.videoPlayerFrame}>
              <Image
                source={{
                  uri:
                    post.imageUrl ||
                    'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80',
                }}
                style={styles.videoThumb}
                resizeMode="cover"
              />
              <View style={styles.videoOverlay}>
                <View style={styles.playBtnCircle}>
                  <Icon name="play" size={24} color={C.white} />
                </View>
                <View style={styles.videoTag}>
                  <Icon name="video" size={13} color={C.white} />
                  <Text style={styles.videoTagText}>PLAY VIDEO CLIP</Text>
                </View>
              </View>
            </View>
            <View style={styles.videoBottomBar}>
              <Text style={styles.videoUrlText} numberOfLines={1}>
                ▶ {post.videoUrl}
              </Text>
            </View>
          </TouchableOpacity>
          <VideoPlayerModal
            visible={playingVideo}
            videoUrl={post.videoUrl}
            onClose={() => setPlayingVideo(false)}
          />
        </>
      )}

      {/* Attached Media: Link Badge */}
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

      {/* Actions Bottom Bar */}
      <View style={styles.actions}>
        <VotePill
          score={post.score}
          myVote={post.myVote}
          onUp={() => toggleVote(post.id, 1)}
          onDown={() => toggleVote(post.id, -1)}
        />
        <View style={styles.pill}>
          <Icon name="comment" size={16} color={C.faint} />
          <Text style={styles.pillText}>
            {fmt(post.comments ? post.comments.length : (post.commentCount ?? 0))}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.pill, styles.sharePill]}
          onPress={handleShare}>
          <Icon name="share" size={16} color={C.faint} />
        </TouchableOpacity>
      </View>

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
  dotsBtn: {
    padding: 6,
    marginLeft: 4,
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
  imageContainer: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: C.pill,
  },
  postImage: {
    width: '100%',
    height: 200,
  },
  mediaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: C.pill,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
    width: 48,
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.sub,
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
  videoCard: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: C.hairline,
  },
  videoPlayerFrame: {
    width: '100%',
    height: 190,
    position: 'relative',
  },
  videoThumb: {
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 69, 0, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3,
    marginBottom: 8,
  },
  videoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  videoTagText: {
    color: C.white,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  videoBottomBar: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  videoUrlText: {
    color: C.orangeSoft,
    fontSize: 12,
    fontWeight: '600',
  },
});
