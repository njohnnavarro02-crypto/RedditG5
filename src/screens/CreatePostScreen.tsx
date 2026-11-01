import React, {useState} from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import CommunityAvatar from '../components/CommunityAvatar';
import Icon from '../components/Icon';
import {usePosts} from '../context/PostsContext';
import {COMMUNITIES} from '../data/mock';
import type {RootStackParamList} from '../navigation/types';
import {assistWriting, WritingHelperAction} from '../services/aiService';
import {C} from '../theme';

// Quick sample image presets for instant selection
const SAMPLE_IMAGES = [
  {
    name: 'Tech Setup',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
  },
  {
    name: 'Coding',
    url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80',
  },
  {
    name: 'Nature',
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80',
  },
  {
    name: 'Gaming',
    url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&q=80',
  },
];

// Quick sample video clip presets for instant selection
const SAMPLE_VIDEOS = [
  {
    name: '🎮 Gaming Highlight Reel (MP4)',
    url: 'https://www.w3schools.com/html/mov_bbb.mp4',
    thumb: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80',
  },
  {
    name: '🚀 Nature & Science Reel (MP4)',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    thumb: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80',
  },
  {
    name: '💻 Tech Trailer (YouTube)',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumb: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80',
  },
];

const EMOJIS = ['🔥', '🚀', '🤖', '💡', '💎', '📈', '💬', '🎉', '👏', '👀'];

/** Create Post screen: community picker, title, body, pictures, video clips, links, and posting. */
export default function CreatePostScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {addPost} = usePosts();
  const insets = useSafeAreaInsets();

  const [communityId, setCommunityId] = useState('technology');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [aiHelperLoading, setAiHelperLoading] = useState(false);

  // Modals for attachments
  const [activeModal, setActiveModal] = useState<'image' | 'video' | 'link' | null>(null);
  const [modalInput, setModalInput] = useState('');

  const canPost = title.trim().length > 0 && !submitting;

  const openAttachmentModal = (type: 'image' | 'video' | 'link') => {
    setActiveModal(type);
    if (type === 'image') setModalInput(imageUrl);
    else if (type === 'video') setModalInput(videoUrl);
    else if (type === 'link') setModalInput(linkUrl);
  };

  const handleSaveAttachment = () => {
    const trimmed = modalInput.trim();
    if (activeModal === 'image') {
      setImageUrl(trimmed);
    } else if (activeModal === 'video') {
      setVideoUrl(trimmed);
    } else if (activeModal === 'link') {
      setLinkUrl(trimmed);
    }
    setActiveModal(null);
    setModalInput('');
  };

  const insertEmoji = (emoji: string) => {
    setBody(prev => prev + emoji);
  };

  const handleAiAssist = async (action: WritingHelperAction) => {
    const targetText = body.trim() || title.trim();
    if (!targetText) {
      Alert.alert('AI Writing Helper', 'Please enter some text in the title or body first.');
      return;
    }
    setAiHelperLoading(true);
    try {
      const result = await assistWriting(targetText, action);
      if (body.trim()) {
        setBody(result);
      } else {
        setTitle(result);
      }
    } catch {
      Alert.alert('AI Helper', 'Unable to process writing suggestion right now.');
    } finally {
      setAiHelperLoading(false);
    }
  };

  const onPost = async () => {
    if (!canPost) {
      return;
    }
    setSubmitting(true);
    try {
      const media = {
        imageUrl: imageUrl.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
        linkUrl: linkUrl.trim() || undefined,
      };

      const post = await addPost(communityId, title.trim(), body.trim(), media);
      setTitle('');
      setBody('');
      setImageUrl('');
      setVideoUrl('');
      setLinkUrl('');
      navigation.navigate('PostDetail', {postId: post.id});
    } catch (err: any) {
      Alert.alert('Post Error', err.message || 'Failed to submit post.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, {paddingTop: insets.top + 6}]}>
        <Text style={styles.headerTitle}>Create post</Text>
      </View>

      <ScrollView contentContainerStyle={{paddingBottom: 24}} showsVerticalScrollIndicator={false}>
        {/* Community Selection */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsRow}
          contentContainerStyle={styles.chipsContent}>
          {COMMUNITIES.map(c => {
            const active = c.id === communityId;
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => setCommunityId(c.id)}
                activeOpacity={0.8}
                style={[styles.chip, active && styles.chipActive]}>
                <CommunityAvatar communityId={c.id} size={18} />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  r/{c.id}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Title Input */}
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor={C.faint}
          maxLength={300}
          multiline
          style={styles.titleInput}
        />
        <View style={styles.divider} />

        {/* Body Input */}
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Text (optional)"
          placeholderTextColor={C.faint}
          multiline
          style={styles.bodyInput}
        />

        {/* AI Writing Helper Bar (M9 Requirement: Improve, Shorten, Translate to Filipino) */}
        <View style={styles.aiHelperBar}>
          <View style={styles.aiHelperLabelRow}>
            <Icon name="sparkle" size={13} color={C.orange} />
            <Text style={styles.aiHelperLabel}>AI Writing Helper</Text>
            {aiHelperLoading && <Text style={styles.aiHelperLoadingText}>Polishing with AI...</Text>}
          </View>
          <View style={styles.aiHelperButtonsRow}>
            <TouchableOpacity
              style={styles.aiHelperBtn}
              onPress={() => handleAiAssist('improve')}
              disabled={aiHelperLoading}
              activeOpacity={0.75}>
              <Text style={styles.aiHelperBtnText}>✨ Improve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.aiHelperBtn}
              onPress={() => handleAiAssist('shorten')}
              disabled={aiHelperLoading}
              activeOpacity={0.75}>
              <Text style={styles.aiHelperBtnText}>✂️ Shorten</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.aiHelperBtn}
              onPress={() => handleAiAssist('translate')}
              disabled={aiHelperLoading}
              activeOpacity={0.75}>
              <Text style={styles.aiHelperBtnText}>🇵🇭 Translate to Filipino</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Attached Image Preview */}
        {!!imageUrl && (
          <View style={styles.attachmentCard}>
            <View style={styles.attachmentHeader}>
              <View style={styles.badgeRow}>
                <Icon name="image" size={16} color={C.orange} />
                <Text style={styles.attachmentTitle}>Photo attached</Text>
              </View>
              <TouchableOpacity onPress={() => setImageUrl('')} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Icon name="close" size={18} color={C.danger} />
              </TouchableOpacity>
            </View>
            <Image source={{uri: imageUrl}} style={styles.previewImage} resizeMode="cover" />
          </View>
        )}

        {/* Attached Video Preview with Player Frame */}
        {!!videoUrl && (
          <View style={styles.attachmentCard}>
            <View style={styles.attachmentHeader}>
              <View style={styles.badgeRow}>
                <Icon name="video" size={16} color={C.orange} />
                <Text style={styles.attachmentTitle}>Video clip attached</Text>
              </View>
              <TouchableOpacity onPress={() => setVideoUrl('')} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Icon name="close" size={18} color={C.danger} />
              </TouchableOpacity>
            </View>
            <View style={styles.videoPreviewPlayer}>
              <View style={styles.videoPlayOverlay}>
                <View style={styles.playCircle}>
                  <Icon name="play" size={24} color={C.white} />
                </View>
                <Text style={styles.videoReadyText}>Video Clip Ready</Text>
              </View>
            </View>
            <Text style={styles.attachmentUrl} numberOfLines={1}>
              {videoUrl}
            </Text>
          </View>
        )}

        {/* Attached Link Preview */}
        {!!linkUrl && (
          <View style={styles.attachmentCard}>
            <View style={styles.attachmentHeader}>
              <View style={styles.badgeRow}>
                <Icon name="link" size={16} color={C.blue} />
                <Text style={styles.attachmentTitle}>Web link attached</Text>
              </View>
              <TouchableOpacity onPress={() => setLinkUrl('')} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Icon name="close" size={18} color={C.danger} />
              </TouchableOpacity>
            </View>
            <Text style={styles.attachmentUrl} numberOfLines={1}>
              {linkUrl}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer Tools Bar: Clickable Image, Video, Link, and Emojis */}
      <View style={[styles.footer, {paddingBottom: Math.max(insets.bottom, 12) + 4}]}>
        <View style={styles.tools}>
          {/* Add Image Tool */}
          <TouchableOpacity
            style={[styles.toolBtn, !!imageUrl && styles.toolBtnActive]}
            onPress={() => openAttachmentModal('image')}
            activeOpacity={0.7}>
            <Icon name="image" size={20} color={imageUrl ? C.orange : C.text} />
          </TouchableOpacity>

          {/* Add Video Clip Tool */}
          <TouchableOpacity
            style={[styles.toolBtn, !!videoUrl && styles.toolBtnActive]}
            onPress={() => openAttachmentModal('video')}
            activeOpacity={0.7}>
            <Icon name="video" size={20} color={videoUrl ? C.orange : C.text} />
          </TouchableOpacity>

          {/* Add Link Tool */}
          <TouchableOpacity
            style={[styles.toolBtn, !!linkUrl && styles.toolBtnActive]}
            onPress={() => openAttachmentModal('link')}
            activeOpacity={0.7}>
            <Icon name="link" size={20} color={linkUrl ? C.orange : C.text} />
          </TouchableOpacity>

          {/* Emoji Shortcuts */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiRow}>
            {EMOJIS.map(e => (
              <TouchableOpacity
                key={e}
                onPress={() => insertEmoji(e)}
                style={styles.emojiBtn}
                activeOpacity={0.6}>
                <Text style={styles.emojiText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <TouchableOpacity
          onPress={onPost}
          disabled={!canPost}
          activeOpacity={0.8}
          style={[styles.postBtn, !canPost && styles.postBtnDisabled]}>
          <Text style={[styles.postBtnText, !canPost && styles.postBtnTextDisabled]}>
            {submitting ? 'Posting...' : 'Post'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Attachment Input Modal */}
      <Modal
        visible={activeModal !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveModal(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeModal === 'image'
                  ? 'Attach Picture'
                  : activeModal === 'video'
                  ? 'Attach Video Clip'
                  : 'Attach Web Link'}
              </Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Icon name="close" size={20} color={C.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>
              {activeModal === 'image'
                ? 'Enter an Image URL or select a sample image below:'
                : activeModal === 'video'
                ? 'Enter an MP4 / YouTube / Reddit Video URL or pick a clip below:'
                : 'Enter a Website URL (https://...):'}
            </Text>

            <TextInput
              style={styles.modalTextInput}
              placeholder={
                activeModal === 'image'
                  ? 'https://example.com/photo.jpg'
                  : activeModal === 'video'
                  ? 'https://example.com/video.mp4'
                  : 'https://mywebsite.com'
              }
              placeholderTextColor={C.faint}
              value={modalInput}
              onChangeText={setModalInput}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Quick Presets for Images */}
            {activeModal === 'image' && (
              <View style={styles.presetsWrap}>
                <Text style={styles.presetsTitle}>Quick Sample Photos:</Text>
                <View style={styles.presetsGrid}>
                  {SAMPLE_IMAGES.map(s => (
                    <TouchableOpacity
                      key={s.name}
                      style={[
                        styles.presetChip,
                        modalInput === s.url && styles.presetChipActive,
                      ]}
                      onPress={() => setModalInput(s.url)}>
                      <Text
                        style={[
                          styles.presetChipText,
                          modalInput === s.url && styles.presetChipTextActive,
                        ]}>
                        {s.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Quick Presets for Video Clips */}
            {activeModal === 'video' && (
              <View style={styles.presetsWrap}>
                <Text style={styles.presetsTitle}>Quick Sample Video Clips:</Text>
                <View style={styles.presetsGrid}>
                  {SAMPLE_VIDEOS.map(v => (
                    <TouchableOpacity
                      key={v.name}
                      style={[
                        styles.presetChip,
                        modalInput === v.url && styles.presetChipActive,
                      ]}
                      onPress={() => setModalInput(v.url)}>
                      <Text
                        style={[
                          styles.presetChipText,
                          modalInput === v.url && styles.presetChipTextActive,
                        ]}>
                        {v.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setActiveModal(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveAttachment}>
                <Text style={styles.modalSaveText}>Attach</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.white,
  },
  header: {
    backgroundColor: C.white,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
    textAlign: 'center',
  },
  chipsRow: {
    marginTop: 12,
  },
  chipsContent: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.hairline,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: C.white,
  },
  chipActive: {
    borderColor: C.orange,
    backgroundColor: C.orangeSoft,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.sub,
  },
  chipTextActive: {
    color: C.orange,
  },
  titleInput: {
    paddingHorizontal: 16,
    paddingTop: 14,
    fontSize: 19,
    fontWeight: '700',
    color: C.text,
    minHeight: 56,
    textAlignVertical: 'top',
  },
  divider: {
    height: 1,
    backgroundColor: C.hairline,
    marginHorizontal: 16,
  },
  bodyInput: {
    paddingHorizontal: 16,
    paddingTop: 12,
    minHeight: 140,
    fontSize: 15,
    lineHeight: 21,
    color: C.text,
    textAlignVertical: 'top',
  },
  attachmentCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: C.pill,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  attachmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attachmentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.text,
  },
  attachmentUrl: {
    fontSize: 12,
    color: C.sub,
    marginTop: 4,
  },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginTop: 6,
  },
  videoPreviewPlayer: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  videoPlayOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.orange,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3,
    marginBottom: 6,
  },
  videoReadyText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.hairline,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  tools: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: C.pill,
  },
  toolBtnActive: {
    backgroundColor: C.orangeSoft,
  },
  emojiRow: {
    flexDirection: 'row',
    maxWidth: 130,
  },
  emojiBtn: {
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  emojiText: {
    fontSize: 18,
  },
  postBtn: {
    marginLeft: 8,
    backgroundColor: C.orange,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  postBtnDisabled: {
    backgroundColor: C.pill,
  },
  postBtnText: {
    color: C.white,
    fontWeight: '800',
    fontSize: 14,
  },
  postBtnTextDisabled: {
    color: C.faint,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: C.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.text,
  },
  modalLabel: {
    fontSize: 13,
    color: C.sub,
    marginBottom: 8,
  },
  modalTextInput: {
    backgroundColor: C.pill,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: C.text,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  presetsWrap: {
    marginTop: 14,
  },
  presetsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: C.sub,
    marginBottom: 6,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: C.pill,
  },
  presetChipActive: {
    backgroundColor: C.orange,
  },
  presetChipText: {
    fontSize: 12,
    color: C.text,
    fontWeight: '600',
  },
  presetChipTextActive: {
    color: C.white,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalCancelText: {
    color: C.sub,
    fontWeight: '700',
  },
  modalSaveBtn: {
    backgroundColor: C.orange,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalSaveText: {
    color: C.white,
    fontWeight: '700',
  },
  aiHelperBar: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    padding: 10,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  aiHelperLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  aiHelperLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.orange,
  },
  aiHelperLoadingText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: C.sub,
    marginLeft: 6,
  },
  aiHelperButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  aiHelperBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: C.pill,
  },
  aiHelperBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.text,
  },
});
