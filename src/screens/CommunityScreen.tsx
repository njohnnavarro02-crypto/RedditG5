import React, {useState} from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import CommunityAvatar from '../components/CommunityAvatar';
import Icon from '../components/Icon';
import JoinButton from '../components/JoinButton';
import PostCard from '../components/PostCard';
import {usePosts} from '../context/PostsContext';
import {COMMUNITIES} from '../data/mock';
import type {RootStackParamList} from '../navigation/types';
import {C} from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Community'>;

/** Community page: colored banner, info card, and that community's feed. */
export default function CommunityScreen({route, navigation}: Props) {
  const {communityId} = route.params;
  const {posts, isJoined, toggleJoin} = usePosts();
  const insets = useSafeAreaInsets();
  const joined = isJoined(communityId);

  const community = COMMUNITIES.find(c => c.id === communityId);
  const color = community?.color ?? C.faint;
  const feed = React.useMemo(() => {
    return posts
      .filter(p => p.communityId === communityId)
      .sort((a, b) => {
        const getMs = (p: (typeof posts)[0]) => {
          if (!p.createdAt) return Date.now();
          if (typeof (p.createdAt as any).toMillis === 'function') return (p.createdAt as any).toMillis();
          if ((p.createdAt as any).seconds) return (p.createdAt as any).seconds * 1000;
          return new Date(p.createdAt as any).getTime();
        };
        const diff = getMs(b) - getMs(a);
        if (!isNaN(diff) && diff !== 0) return diff;
        return a.hoursAgo - b.hoursAgo;
      });
  }, [posts, communityId]);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, {paddingTop: insets.top + 6}]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Icon name="back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>r/{communityId}</Text>
        <Icon name="search" size={22} color={C.text} />
      </View>

      <FlatList
        data={feed}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <View style={[styles.banner, {backgroundColor: color}]} />
            <View style={styles.infoCard}>
              <View style={styles.infoTop}>
                <CommunityAvatar communityId={communityId} size={56} />
                <View style={styles.infoText}>
                  <Text style={styles.name}>r/{communityId}</Text>
                  <Text style={styles.meta}>
                    {community?.members ?? '—'} members • {community?.online ?? '—'} online
                  </Text>
                </View>
                <JoinButton joined={joined} onPress={() => toggleJoin(communityId)} />
              </View>
              {!!community?.description && (
                <Text style={styles.description}>{community.description}</Text>
              )}
            </View>
          </View>
        }
        renderItem={({item}) => <PostCard post={item} showCommunity={false} />}
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
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },
  banner: {
    height: 90,
  },
  infoCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.hairline,
    marginHorizontal: 12,
    marginTop: -28,
    padding: 14,
  },
  infoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
  },
  meta: {
    marginTop: 2,
    fontSize: 12,
    color: C.sub,
  },
  description: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    color: C.sub,
  },
  list: {
    paddingBottom: 16,
  },
});
