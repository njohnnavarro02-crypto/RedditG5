import React, {useMemo, useState} from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import Icon from '../components/Icon';
import PostCard from '../components/PostCard';
import {usePosts} from '../context/PostsContext';
import type {TabParamList} from '../navigation/types';
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

/** Home feed: logo header, clickable search & chat icons, sort chips, Reddit-style post cards. */
export default function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const {posts} = usePosts();
  const insets = useSafeAreaInsets();
  const [sort, setSort] = useState<SortKey>('hot');
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter posts based on search query
  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) {
      return posts;
    }
    const q = searchQuery.toLowerCase().trim();
    return posts.filter(
      p =>
        p.title.toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q) ||
        p.communityId.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q),
    );
  }, [posts, searchQuery]);

  const sorted = useMemo(() => sortPosts(filteredPosts, sort), [filteredPosts, sort]);

  const handleCloseSearch = () => {
    setIsSearching(false);
    setSearchQuery('');
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, {paddingTop: insets.top + 6}]}>
        {isSearching ? (
          <View style={styles.searchBarContainer}>
            <Icon name="search" size={20} color={C.faint} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search posts, tags, communities..."
              placeholderTextColor={C.faint}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                style={styles.clearBtn}>
                <Icon name="close" size={16} color={C.faint} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleCloseSearch} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Image
              source={require('../assets/reddit-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={styles.headerIcons}>
              {/* Clickable Search Icon */}
              <TouchableOpacity
                onPress={() => setIsSearching(true)}
                activeOpacity={0.7}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                style={styles.iconBtn}>
                <Icon name="search" size={22} color={C.text} />
              </TouchableOpacity>

              {/* Clickable Inbox / Notifications Icon */}
              <TouchableOpacity
                onPress={() => navigation.navigate('Inbox')}
                activeOpacity={0.7}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                style={styles.iconBtn}>
                <Icon name="bell" size={22} color={C.text} />
              </TouchableOpacity>
            </View>
          </>
        )}
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
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No matching posts found' : 'No posts yet'}
            </Text>
            <Text style={styles.emptySub}>
              {searchQuery
                ? `We couldn't find anything for "${searchQuery}". Try different keywords.`
                : 'Create your first post using the + button below!'}
            </Text>
          </View>
        }
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
    minHeight: 52,
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
  iconBtn: {
    padding: 4,
    borderRadius: 20,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.pill,
    borderRadius: 24,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: C.text,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  cancelBtn: {
    paddingLeft: 6,
    paddingVertical: 4,
  },
  cancelBtnText: {
    color: C.orange,
    fontSize: 14,
    fontWeight: '700',
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
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: C.faint,
    textAlign: 'center',
    lineHeight: 18,
  },
});
