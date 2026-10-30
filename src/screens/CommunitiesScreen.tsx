import React, {useState} from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import CommunityAvatar from '../components/CommunityAvatar';
import JoinButton from '../components/JoinButton';
import {COMMUNITIES} from '../data/mock';
import type {RootStackParamList} from '../navigation/types';
import {C} from '../theme';

/** Communities directory: list of r/ channels with member counts and Join. */
export default function CommunitiesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setJoinedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, {paddingTop: insets.top + 6}]}>
        <Text style={styles.title}>Communities</Text>
      </View>
      <FlatList
        data={COMMUNITIES}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({item}) => (
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('Community', {communityId: item.id})}>
            <CommunityAvatar communityId={item.id} size={48} />
            <View style={styles.info}>
              <Text style={styles.name}>r/{item.id}</Text>
              <Text style={styles.meta}>
                {item.members} members • {item.online} online
              </Text>
            </View>
            <JoinButton
              joined={joinedIds.has(item.id)}
              onPress={() => toggle(item.id)}
            />
          </TouchableOpacity>
        )}
      />
    </View>
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
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: C.text,
  },
  list: {
    paddingTop: 6,
    paddingBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  meta: {
    marginTop: 2,
    fontSize: 12,
    color: C.sub,
  },
});
