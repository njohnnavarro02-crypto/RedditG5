import React, {useState} from 'react';
import {Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/types';
import {C} from '../theme';
import {COMMUNITIES} from '../data/mock';

/** Screen for creating a new community (r/). */
export default function CreateCommunityScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [id, setId] = useState(''); // community slug
  const [name, setName] = useState(''); // displayed name (same as id for simplicity)
  const [color, setColor] = useState('#'); // hex color
  const [description, setDescription] = useState('');

  const canCreate = id.trim().length > 0 && color.trim().length > 0 && description.trim().length > 0;

  const onCreate = () => {
    if (!canCreate) {
      Alert.alert('Missing fields', 'Please fill all fields.');
      return;
    }
    // Ensure id is unique
    if (COMMUNITIES.some(c => c.id === id.trim())) {
      Alert.alert('Duplicate', 'A community with this name already exists.');
      return;
    }
    const newCommunity = {
      id: id.trim(),
      color: color.trim() || '#888888',
      members: '0',
      online: '0',
      description: description.trim(),
    };
    // Mutate the mock array (allowed for in‑memory demo)
    COMMUNITIES.push(newCommunity as any);
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Create Community</Text>
        <View style={styles.field}>
          <Text style={styles.label}>Community ID (e.g., "mytopic")</Text>
          <TextInput
            style={styles.input}
            placeholder="mytopic"
            placeholderTextColor={C.faint}
            value={id}
            onChangeText={setId}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Color (hex, e.g., #FF4500)</Text>
          <TextInput
            style={styles.input}
            placeholder="#FF4500"
            placeholderTextColor={C.faint}
            value={color}
            onChangeText={setColor}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, {height: 80}]}
            placeholder="A place for …"
            placeholderTextColor={C.faint}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>
        <TouchableOpacity
          style={[styles.createBtn, {backgroundColor: canCreate ? C.orange : C.faint}]}
          onPress={onCreate}
          disabled={!canCreate}
        >
          <Text style={styles.createBtnText}>Create</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: C.white},
  container: {padding: 16},
  title: {fontSize: 24, fontWeight: '800', color: C.text, marginBottom: 12},
  field: {marginBottom: 12},
  label: {fontSize: 14, color: C.text, marginBottom: 4},
  input: {
    borderWidth: 1,
    borderColor: C.hairline,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    color: C.text,
  },
  createBtn: {marginTop: 16, paddingVertical: 10, borderRadius: 6, alignItems: 'center'},
  createBtnText: {color: C.white, fontWeight: '600'},
});

