import React, {useState} from 'react';
import {
  Alert,
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
import Icon from '../components/Icon';
import {COMMUNITIES} from '../data/mock';
import type {RootStackParamList} from '../navigation/types';
import {C} from '../theme';

const COLOR_PRESETS = [
  '#FF4500', // Reddit orange
  '#3B82F6', // Blue
  '#9B59B6', // Purple
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#64748B', // Slate
];

/** Screen for creating a new community (r/). */
export default function CreateCommunityScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const [id, setId] = useState('');
  const [color, setColor] = useState('#FF4500');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Clean community ID: lowercase, remove spaces and special characters
  const cleanId = id.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

  const canCreate = cleanId.length >= 3 && description.trim().length > 0 && !submitting;

  const onCreate = () => {
    if (!canCreate) {
      if (cleanId.length < 3) {
        Alert.alert('Invalid Name', 'Community name must be at least 3 letters/numbers.');
      } else {
        Alert.alert('Missing Fields', 'Please enter a description for your community.');
      }
      return;
    }

    if (COMMUNITIES.some(c => c.id.toLowerCase() === cleanId)) {
      Alert.alert('Duplicate Name', `r/${cleanId} already exists. Please choose a different name.`);
      return;
    }

    setSubmitting(true);
    const newCommunity = {
      id: cleanId,
      color: color || '#FF4500',
      members: '1',
      online: '1',
      description: description.trim(),
    };

    COMMUNITIES.unshift(newCommunity);
    Alert.alert('Success 🎉', `r/${cleanId} has been created!`, [
      {
        text: 'View Communities',
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Screen Header */}
      <View style={[styles.header, {paddingTop: insets.top + 6}]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
          style={styles.backBtn}>
          <Icon name="back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create a community</Text>
        <View style={{width: 32}} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}>
        {/* Live Preview Card */}
        <View style={styles.previewBox}>
          <Text style={styles.previewLabel}>PREVIEW</Text>
          <View style={styles.previewCard}>
            <View style={[styles.avatarPreview, {backgroundColor: color}]}>
              <Text style={styles.avatarLetter}>
                {cleanId ? cleanId.charAt(0).toUpperCase() : 'R'}
              </Text>
            </View>
            <View style={styles.previewInfo}>
              <Text style={styles.previewName}>
                r/{cleanId || 'community_name'}
              </Text>
              <Text style={styles.previewMembers}>1 member • 1 online</Text>
              <Text style={styles.previewDesc} numberOfLines={2}>
                {description || 'Community description will appear here...'}
              </Text>
            </View>
          </View>
        </View>

        {/* Community Name Field */}
        <View style={styles.field}>
          <Text style={styles.label}>Community name</Text>
          <Text style={styles.hint}>
            Community names including capitalization cannot be changed.
          </Text>
          <View style={styles.prefixInput}>
            <Text style={styles.prefixText}>r/</Text>
            <TextInput
              style={styles.textInputInside}
              placeholder="community_name"
              placeholderTextColor={C.faint}
              value={id}
              onChangeText={setId}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={21}
            />
          </View>
          <Text style={styles.charCount}>{21 - cleanId.length} characters remaining</Text>
        </View>

        {/* Description Field */}
        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <Text style={styles.hint}>
            Explain what your community is about to new members.
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Tell people about this community..."
            placeholderTextColor={C.faint}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={500}
          />
        </View>

        {/* Community Theme Color */}
        <View style={styles.field}>
          <Text style={styles.label}>Theme color</Text>
          <Text style={styles.hint}>Choose an accent color for your community badge.</Text>
          <View style={styles.colorsGrid}>
            {COLOR_PRESETS.map(c => (
              <TouchableOpacity
                key={c}
                onPress={() => setColor(c)}
                style={[
                  styles.colorCircle,
                  {backgroundColor: c},
                  color === c && styles.colorCircleActive,
                ]}>
                {color === c && <Icon name="up" size={14} color={C.white} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.createBtn, !canCreate && styles.createBtnDisabled]}
          onPress={onCreate}
          disabled={!canCreate}
          activeOpacity={0.8}>
          <Text style={[styles.createBtnText, !canCreate && styles.createBtnTextDisabled]}>
            {submitting ? 'Creating...' : 'Create Community'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
    backgroundColor: C.white,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  previewBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: C.sub,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatarPreview: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: C.white,
    fontSize: 20,
    fontWeight: '800',
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  previewMembers: {
    fontSize: 11,
    color: C.sub,
    marginTop: 2,
  },
  previewDesc: {
    fontSize: 12,
    color: C.sub,
    marginTop: 4,
    lineHeight: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  hint: {
    fontSize: 12,
    color: C.sub,
    marginTop: 2,
    marginBottom: 8,
  },
  prefixInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.hairline,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
  },
  prefixText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.sub,
    marginRight: 2,
  },
  textInputInside: {
    flex: 1,
    fontSize: 15,
    color: C.text,
    paddingVertical: 10,
  },
  charCount: {
    fontSize: 11,
    color: C.faint,
    marginTop: 4,
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderColor: C.hairline,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: C.text,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  colorsGrid: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorCircleActive: {
    borderWidth: 3,
    borderColor: C.text,
  },
  createBtn: {
    backgroundColor: C.orange,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    marginTop: 10,
  },
  createBtnDisabled: {
    backgroundColor: '#E5E7EB',
  },
  createBtnText: {
    color: C.white,
    fontSize: 16,
    fontWeight: '700',
  },
  createBtnTextDisabled: {
    color: '#9CA3AF',
  },
});
