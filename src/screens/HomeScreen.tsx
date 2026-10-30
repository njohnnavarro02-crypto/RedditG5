import React, {useMemo, useState} from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import PostCard from '../components/PostCard';
import {usePosts} from '../context/PostsContext';
import {C} from '../theme';
import {Post} from '../types';

type SortKey = 'hot' | 'new' | 'top';

const CHIPS: {key: SortKey; label: string}[] = [
  {key: 'hot', label: 'Hot'},
  {key: 'new', label: 'New'},
  {key: 'top', label: 'Top'},
];

function sortPosts(posts: Post[], sort: SortKey): Post[] {
  const copy = [...posts];
  switch (sort) {
    case 'new':
      return copy.sort((a, b) => a.hoursAgo - b.hoursAgo);
    case 'top':
      return copy.sort((a, b) => b.score - a.score);
    case 'hot':
    default:
      return copy.sort(
        (a, b) =>
          b.score / Math.pow(b.hoursAgo + 2, 1.2) -
          a.score / Math.pow(a.hoursAgo + 2, 1.2),
      );
  }
}

/** Home feed: logo header, sort chips, Reddit-style post cards. */
export default function HomeScreen() {
  const {posts} = usePosts();
  const insets = useSafeAreaInsets();
  const [sort, setSort] = useState<SortKey>('hot');

  const sorted = useMemo(() => sortPosts(posts, sort), [posts, sort]);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, {paddingTop: insets.top + 6}]}>
        <Image
          source={require('../assets/reddit-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.headerIcons}>
          <Icon name="search" size={22} color={C.text} />
          <Icon name="comment" size={22} color={C.text} />
        </View>
      </View>

      <View style={styles.chips}>
        {CHIPS.map(chip => {
          const active = chip.key === sort;
          return (
            <TouchableOpacity
              key={chip.key}
              onPress={() => setSort(chip.key)}
              activeOpacity={0.8}
              style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={sorted}
        keyExtractor={item => item.id}
        renderItem={({item}) => <PostCard post={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
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
    paddingBottom: 8,
  },
  logo: {
    width: 104,
    height: 36,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.hairline,
    backgroundColor: C.white,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  chipActive: {
    backgroundColor: C.text,
    borderColor: C.text,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.sub,
  },
  chipTextActive: {
    color: C.white,
  },
  list: {
    paddingBottom: 12,
  },
});
