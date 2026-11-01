import React, {useMemo, useState} from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
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
import Icon from '../components/Icon';
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

const AVATAR_PRESETS = [
  {
    name: 'Classic Snoo',
    url: 'https://www.redditstatic.com/avatars/defaults/v2/avatar_default_1.png',
  },
  {
    name: 'Orange Snoo',
    url: 'https://www.redditstatic.com/avatars/defaults/v2/avatar_default_2.png',
  },
  {
    name: 'Blue Snoo',
    url: 'https://www.redditstatic.com/avatars/defaults/v2/avatar_default_3.png',
  },
  {
    name: 'Purple Snoo',
    url: 'https://www.redditstatic.com/avatars/defaults/v2/avatar_default_4.png',
  },
  {
    name: 'Cool Snoo',
    url: 'https://www.redditstatic.com/avatars/defaults/v2/avatar_default_5.png',
  },
  {
    name: 'Gamer Snoo',
    url: 'https://www.redditstatic.com/avatars/defaults/v2/avatar_default_6.png',
  },
  {
    name: 'Cyberpunk',
    url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200&q=80',
  },
  {
    name: 'Tech Setup',
    url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200&q=80',
  },
];

/** Profile screen: avatar, username, edit profile modal, dynamic karma, tabs for posts/comments, and log out. */
export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const {userName, userPhoto, posts, signOut, user, updateProfile} = usePosts();
  const [segment, setSegment] = useState<Segment>('overview');

  // Edit profile modal state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [draftName, setDraftName] = useState(userName);
  const [draftPhoto, setDraftPhoto] = useState(userPhoto || '');
  const [saving, setSaving] = useState(false);

  // Filter posts authored strictly by this user/account
  const myPosts = useMemo(() => {
    return posts.filter(p => {
      if (user) {
        return !!p.authorId && p.authorId === user.uid;
      }
      return !p.authorId && p.author === 'u/' + userName;
    });
  }, [posts, user, userName]);

  // Filter comments authored strictly by this user/account
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
        const isMine = user
          ? (c as any).authorId === user.uid || (p.authorId === user.uid && c.author === 'u/' + userName)
          : !p.authorId && c.author === 'u/' + userName;
        if (isMine) {
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
  }, [posts, user, userName]);

  // Dynamic karma starting at 0 for new accounts
  const postKarma = useMemo(() => {
    if (myPosts.length === 0) return 0;
    return myPosts.reduce((acc, p) => acc + Math.max(0, p.score), 0);
  }, [myPosts]);

  const commentKarma = useMemo(() => {
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

  const handleOpenEdit = () => {
    setDraftName(userName);
    setDraftPhoto(userPhoto || '');
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    if (saving) return;
    const clean = draftName
      .trim()
      .replace(/^u\//, '')
      .replace(/\s+/g, '_')
      .toLowerCase();

    if (!clean) {
      Alert.alert('Invalid Username', 'Username cannot be blank.');
      return;
    }

    setSaving(true);
    try {
      await updateProfile(clean, draftPhoto.trim() || undefined);
      setIsEditingProfile(false);
      Alert.alert('Profile Updated', 'Your profile has been saved successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const showPosts = segment === 'overview' || segment === 'posts';

  return (
    <View style={styles.screen}>
      <View style={[styles.header, {paddingTop: insets.top + 10}]}>
        {/* Clickable Profile Avatar with Edit Badge */}
        <TouchableOpacity
          style={styles.avatarWrap}
          activeOpacity={0.85}
          onPress={handleOpenEdit}>
          <Image
            source={userPhoto ? {uri: userPhoto} : require('../assets/reddit-icon.png')}
            style={styles.avatar}
          />
          <View style={styles.avatarEditBadge}>
            <Icon name="dots" size={14} color={C.white} />
          </View>
        </TouchableOpacity>

        {/* Display Username */}
        <Text style={styles.name}>u/{userName}</Text>
        <Text style={styles.cakeDay}>{cakeDay}</Text>

        {/* Karma Badges */}
        <View style={styles.karmaRow}>
          <View style={styles.karmaChip}>
            <Text style={styles.karmaText}>Post karma {fmt(postKarma)}</Text>
          </View>
          <View style={styles.karmaChip}>
            <Text style={styles.karmaText}>Comment karma {fmt(commentKarma)}</Text>
          </View>
        </View>

        {/* Edit Profile Action Button */}
        <TouchableOpacity
          style={styles.editProfileBtn}
          activeOpacity={0.8}
          onPress={handleOpenEdit}>
          <Text style={styles.editProfileText}>Edit profile</Text>
        </TouchableOpacity>
      </View>

      {/* Segments: Overview, Posts, Comments */}
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

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditingProfile}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsEditingProfile(false)}>
        <SafeAreaView style={styles.modalSafeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{flex: 1}}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setIsEditingProfile(false)}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Icon name="close" size={22} color={C.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity
                onPress={handleSaveProfile}
                disabled={saving}
                style={styles.modalSaveBadge}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Text style={[styles.modalSave, saving && styles.modalSaveDisabled]}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalBody}>
              {/* Avatar Preview */}
              <View style={styles.avatarPreviewSection}>
                <Image
                  source={
                    draftPhoto ? {uri: draftPhoto} : require('../assets/reddit-icon.png')
                  }
                  style={styles.avatarLarge}
                />
                <Text style={styles.avatarPreviewName}>
                  u/{draftName ? draftName.trim().replace(/^u\//, '').replace(/\s+/g, '_').toLowerCase() : 'username'}
                </Text>
              </View>

              {/* Username Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Username</Text>
                <View style={styles.usernameInputWrap}>
                  <Text style={styles.usernamePrefix}>u/</Text>
                  <TextInput
                    style={styles.usernameInput}
                    value={draftName}
                    onChangeText={setDraftName}
                    placeholder="your_username"
                    placeholderTextColor={C.faint}
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={30}
                  />
                </View>
                <Text style={styles.inputHint}>
                  Spaces will be converted to underscores.
                </Text>
              </View>

              {/* Avatar Presets Gallery */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Choose Avatar Preset</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.avatarPresetsRow}>
                  {AVATAR_PRESETS.map(preset => {
                    const active = draftPhoto === preset.url;
                    return (
                      <TouchableOpacity
                        key={preset.name}
                        style={[styles.presetCard, active && styles.presetCardActive]}
                        onPress={() => setDraftPhoto(preset.url)}
                        activeOpacity={0.8}>
                        <Image source={{uri: preset.url}} style={styles.presetThumb} />
                        <Text style={[styles.presetName, active && styles.presetNameActive]} numberOfLines={1}>
                          {preset.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Custom Image URL Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Or Enter Custom Picture URL</Text>
                <TextInput
                  style={styles.textInput}
                  value={draftPhoto}
                  onChangeText={setDraftPhoto}
                  placeholder="https://example.com/avatar.png"
                  placeholderTextColor={C.faint}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {draftPhoto ? (
                  <TouchableOpacity
                    style={styles.clearAvatarBtn}
                    onPress={() => setDraftPhoto('')}>
                    <Text style={styles.clearAvatarText}>Reset to default avatar</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Primary Save Changes Button */}
              <TouchableOpacity
                style={[styles.saveChangesBtn, saving && styles.saveChangesBtnDisabled]}
                onPress={handleSaveProfile}
                disabled={saving}
                activeOpacity={0.8}>
                <Text style={styles.saveChangesBtnText}>
                  {saving ? 'Saving changes...' : 'Save changes'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
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
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.pill,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: C.orange,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: C.white,
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
  editProfileBtn: {
    marginTop: 12,
    paddingVertical: 7,
    paddingHorizontal: 22,
    borderRadius: 20,
    backgroundColor: C.pill,
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '700',
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
    marginTop: 40,
    fontSize: 14,
    paddingHorizontal: 20,
  },
  commentsWrap: {
    padding: 12,
    gap: 10,
  },
  commentRow: {
    backgroundColor: C.white,
    padding: 14,
    borderRadius: 8,
  },
  commentMeta: {
    fontSize: 12,
    color: C.sub,
    fontWeight: '600',
  },
  commentBody: {
    fontSize: 14,
    color: C.text,
    marginTop: 6,
    lineHeight: 19,
  },
  commentScore: {
    marginTop: 8,
    fontSize: 12,
    color: C.orange,
    fontWeight: '700',
  },
  logoutWrap: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  logoutBtn: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
  },
  logoutText: {
    color: C.danger,
    fontSize: 15,
    fontWeight: '700',
  },
  // Modal styles
  modalSafeArea: {
    flex: 1,
    backgroundColor: C.white,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
  },
  modalSaveBadge: {
    backgroundColor: C.orange,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  modalCancel: {
    fontSize: 15,
    color: C.sub,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.text,
  },
  modalSave: {
    fontSize: 14,
    color: C.white,
    fontWeight: '800',
  },
  modalSaveDisabled: {
    opacity: 0.6,
  },
  modalBody: {
    padding: 16,
    paddingBottom: 40,
  },
  avatarPreviewSection: {
    alignItems: 'center',
    marginVertical: 16,
  },
  avatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: C.pill,
    borderWidth: 3,
    borderColor: C.hairline,
  },
  avatarPreviewName: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
    marginBottom: 6,
  },
  usernameInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.hairline,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
  },
  usernamePrefix: {
    fontSize: 15,
    fontWeight: '700',
    color: C.sub,
    marginRight: 2,
  },
  usernameInput: {
    flex: 1,
    fontSize: 15,
    color: C.text,
    paddingVertical: 10,
  },
  inputHint: {
    fontSize: 11,
    color: C.faint,
    marginTop: 4,
  },
  avatarPresetsRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  presetCard: {
    alignItems: 'center',
    marginRight: 12,
    padding: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#F8F9FA',
  },
  presetCardActive: {
    borderColor: C.orange,
    backgroundColor: C.orangeSoft,
  },
  presetThumb: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.white,
  },
  presetName: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '600',
    color: C.sub,
    maxWidth: 60,
    textAlign: 'center',
  },
  presetNameActive: {
    color: C.orange,
    fontWeight: '700',
  },
  textInput: {
    borderWidth: 1,
    borderColor: C.hairline,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: C.text,
  },
  clearAvatarBtn: {
    marginTop: 6,
  },
  clearAvatarText: {
    fontSize: 12,
    color: C.orange,
    fontWeight: '600',
  },
  saveChangesBtn: {
    backgroundColor: C.orange,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  saveChangesBtnDisabled: {
    backgroundColor: C.faint,
  },
  saveChangesBtnText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '800',
  },
});
