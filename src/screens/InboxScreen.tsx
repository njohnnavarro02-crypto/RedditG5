import React, {useMemo, useState} from 'react';
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
import Icon from '../components/Icon';
import {usePosts} from '../context/PostsContext';
import type {RootStackParamList} from '../navigation/types';
import {C} from '../theme';

type NotificationType = 'comment' | 'upvote' | 'reply' | 'mention';

interface Notification {
  id: string;
  type: NotificationType;
  communityId: string;
  postId: string;
  from: string;
  message: string;
  time: string;
  read: boolean;
}

type FilterTab = 'all' | 'comments' | 'upvotes' | 'mentions';

/** Inbox / Notifications screen — shows activity on the user's posts. */
export default function InboxScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {posts, userName, user} = usePosts();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // Build notifications from comments and replies across all posts
  const notifications = useMemo<Notification[]>(() => {
    const items: Notification[] = [];
    const clean = (s?: string) => (s || '').replace(/^[@u\/]+/, '').trim().toLowerCase();
    const myCleanName = clean(userName);

    posts.forEach(post => {
      const isMyPost = user
        ? post.authorId === user.uid
        : clean(post.author) === myCleanName;

      if (!post.comments || post.comments.length === 0) return;

      post.comments.forEach(comment => {
        const commentAuthorClean = clean(comment.author);
        const replyToClean = clean(comment.replyToAuthor);
        const isFromMe = (comment.authorId && user && comment.authorId === user.uid) || commentAuthorClean === myCleanName;
        const isReplyToMe = Boolean(replyToClean && replyToClean === myCleanName);

        // 1. Reply Notification: someone replied directly to my comment!
        if (isReplyToMe && !isFromMe) {
          items.push({
            id: `notif_reply_${comment.id}`,
            type: 'reply',
            communityId: post.communityId,
            postId: post.id,
            from: comment.author,
            message: `replied to your comment: "${comment.body.slice(0, 60)}${comment.body.length > 60 ? '…' : ''}"`,
            time: comment.time,
            read: false,
          });
        }
        // 2. Post Comment Notification: someone commented on my post (and it wasn't a reply to another user)
        else if (isMyPost && !isFromMe && (!comment.replyToAuthor || isReplyToMe)) {
          items.push({
            id: `notif_comment_${comment.id}`,
            type: 'comment',
            communityId: post.communityId,
            postId: post.id,
            from: comment.author,
            message: `commented on your post "${post.title.slice(0, 40)}${post.title.length > 40 ? '…' : ''}": ${comment.body.slice(0, 60)}${comment.body.length > 60 ? '…' : ''}`,
            time: comment.time,
            read: false,
          });
        }
        // 3. Mention Notification: someone mentioned me in any comment
        else if (!isFromMe && clean(comment.body).includes(myCleanName)) {
          items.push({
            id: `notif_mention_${comment.id}`,
            type: 'mention',
            communityId: post.communityId,
            postId: post.id,
            from: comment.author,
            message: `mentioned you in r/${post.communityId}: "${comment.body.slice(0, 60)}${comment.body.length > 60 ? '…' : ''}"`,
            time: comment.time,
            read: false,
          });
        }
      });

      // Upvote milestone notifications
      if (isMyPost && post.score >= 5) {
        items.push({
          id: `notif_upvote_${post.id}`,
          type: 'upvote',
          communityId: post.communityId,
          postId: post.id,
          from: 'r/' + post.communityId,
          message: `Your post "${post.title.slice(0, 40)}${post.title.length > 40 ? '…' : ''}" has ${post.score.toLocaleString()} upvotes! 🎉`,
          time: post.time,
          read: false,
        });
      }
    });

    // Add default community / trending notifications if user has few notifications
    if (items.length === 0) {
      items.push(
        {
          id: 'notif_welcome',
          type: 'mention',
          communityId: 'general',
          postId: posts[0]?.id || 'p1',
          from: 'Reddit Team',
          message: 'Welcome to Reddit! You can join communities, upvote posts, share photos & video clips, and create communities.',
          time: '1h',
          read: false,
        },
        {
          id: 'notif_trending_tech',
          type: 'upvote',
          communityId: 'technology',
          postId: 'p1',
          from: 'r/technology',
          message: 'Trending today: "USB-C everything: EU deadline hits..." with 12k+ upvotes.',
          time: '3h',
          read: false,
        },
        {
          id: 'notif_trending_gaming',
          type: 'comment',
          communityId: 'gaming',
          postId: 'p_video_featured',
          from: 'r/gaming',
          message: 'Trending video clip: "Insane 1v4 clutch in overtime — world championship qualifier clip!"',
          time: '4h',
          read: false,
        },
      );
    }

    return items;
  }, [posts, userName, user]);

  // Track which notifications have been read
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const markAsRead = (id: string) => {
    setReadIds(prev => new Set(prev).add(id));
  };

  const markAllAsRead = () => {
    setReadIds(new Set(notifications.map(n => n.id)));
  };

  // Filter based on active tab
  const filtered = useMemo(() => {
    const withReadState = notifications.map(n => ({
      ...n,
      read: readIds.has(n.id),
    }));
    if (activeTab === 'all') return withReadState;
    if (activeTab === 'comments') return withReadState.filter(n => n.type === 'comment' || n.type === 'reply');
    if (activeTab === 'upvotes') return withReadState.filter(n => n.type === 'upvote');
    if (activeTab === 'mentions') return withReadState.filter(n => n.type === 'mention');
    return withReadState;
  }, [notifications, activeTab, readIds]);

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  const TABS: {key: FilterTab; label: string}[] = [
    {key: 'all', label: 'All'},
    {key: 'comments', label: 'Comments'},
    {key: 'upvotes', label: 'Upvotes'},
    {key: 'mentions', label: 'Mentions'},
  ];

  const iconForType = (type: NotificationType) => {
    switch (type) {
      case 'comment':
      case 'reply':
        return 'comment' as const;
      case 'upvote':
        return 'up' as const;
      case 'mention':
        return 'user' as const;
    }
  };

  const colorForType = (type: NotificationType) => {
    switch (type) {
      case 'comment':
      case 'reply':
        return '#3B82F6';
      case 'upvote':
        return C.orange;
      case 'mention':
        return '#8B5CF6';
    }
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top + 6}]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Inbox</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
          <View style={{flex: 1}} />
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead} style={styles.markAllBtn}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabs}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}>
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Notification List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Icon name="bell" size={48} color={C.faint} />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySub}>
              When someone interacts with your posts, you'll see it here.
            </Text>
          </View>
        }
        renderItem={({item}) => (
          <TouchableOpacity
            style={[styles.notifRow, !item.read && styles.notifUnread]}
            activeOpacity={0.8}
            onPress={() => {
              markAsRead(item.id);
              navigation.navigate('PostDetail', {postId: item.postId});
            }}>
            {/* Icon */}
            <View style={[styles.notifIcon, {backgroundColor: colorForType(item.type) + '18'}]}>
              <Icon name={iconForType(item.type)} size={18} color={colorForType(item.type)} />
            </View>

            {/* Content */}
            <View style={styles.notifContent}>
              <Text style={styles.notifFrom}>{item.from}</Text>
              <Text style={styles.notifMsg} numberOfLines={2}>{item.message}</Text>
              <View style={styles.notifMeta}>
                <CommunityAvatar communityId={item.communityId} size={14} />
                <Text style={styles.notifTime}>r/{item.communityId} • {item.time}</Text>
              </View>
            </View>

            {/* Unread dot */}
            {!item.read && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: C.white},
  header: {
    backgroundColor: C.white,
    paddingHorizontal: 16,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: C.text,
  },
  badge: {
    backgroundColor: C.orange,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  badgeText: {
    color: C.white,
    fontSize: 11,
    fontWeight: '700',
  },
  markAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  markAllText: {
    color: C.orange,
    fontSize: 13,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    gap: 4,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: C.orange,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.sub,
  },
  tabTextActive: {
    color: C.text,
  },
  list: {
    paddingTop: 4,
    paddingBottom: 16,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
  },
  notifUnread: {
    backgroundColor: '#FFF7ED',
  },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  notifContent: {
    flex: 1,
  },
  notifFrom: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
  },
  notifMsg: {
    fontSize: 13,
    color: C.sub,
    marginTop: 2,
    lineHeight: 18,
  },
  notifMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  notifTime: {
    fontSize: 11,
    color: C.faint,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.orange,
    marginTop: 6,
    marginLeft: 8,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    color: C.sub,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});

