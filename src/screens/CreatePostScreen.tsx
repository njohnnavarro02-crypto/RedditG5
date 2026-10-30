import React, {useState} from 'react';
import {
  KeyboardAvoidingView,
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
import {C} from '../theme';

/** Create Post screen: community picker, title, body, and Post button. */
export default function CreatePostScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {addPost} = usePosts();
  const insets = useSafeAreaInsets();

  const [communityId, setCommunityId] = useState('technology');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const canPost = title.trim().length > 0;

  const onPost = () => {
    if (!canPost) {
      return;
    }
    const post = addPost(communityId, title.trim(), body.trim());
    setTitle('');
    setBody('');
    navigation.navigate('PostDetail', {postId: post.id});
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, {paddingTop: insets.top + 6}]}>
        <Text style={styles.headerTitle}>Create post</Text>
      </View>

      <ScrollView contentContainerStyle={{paddingBottom: 24}} showsVerticalScrollIndicator={false}>
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
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Text (optional)"
          placeholderTextColor={C.faint}
          multiline
          style={styles.bodyInput}
        />
      </ScrollView>

      <View style={[styles.footer, {paddingBottom: Math.max(insets.bottom, 12) + 4}]}>
        <View style={styles.tools}>
          <Icon name="image" size={20} color={C.faint} />
          <Icon name="link" size={20} color={C.faint} />
          <Icon name="emoji" size={20} color={C.faint} />
        </View>
        <TouchableOpacity
          onPress={onPost}
          disabled={!canPost}
          activeOpacity={0.8}
          style={[styles.postBtn, !canPost && styles.postBtnDisabled]}>
          <Text style={[styles.postBtnText, !canPost && styles.postBtnTextDisabled]}>
            Post
          </Text>
        </TouchableOpacity>
      </View>
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
    minHeight: 160,
    fontSize: 15,
    lineHeight: 21,
    color: C.text,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.hairline,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  tools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  postBtn: {
    marginLeft: 'auto',
    backgroundColor: C.orange,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 10,
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
});
