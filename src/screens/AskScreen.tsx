import React, {useEffect, useRef, useState} from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
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
import {usePosts} from '../context/PostsContext';
import type {RootStackParamList} from '../navigation/types';
import {askAiQuestion} from '../services/aiService';
import {C} from '../theme';
import {ChatMessage} from '../types';

const GREETING: ChatMessage = {
  id: 'm0',
  role: 'ai',
  text: "Hi! I'm your Reddit AI Assistant. Ask me anything about trending community posts, discussions, or any question you have!",
  refs: [],
};

const SUGGESTIONS = [
  'How hard is the Rizal subject?',
  "What's trending across communities?",
  'Summarize r/technology today',
  'Who was Jose Rizal?',
];

/** Split text into plain parts and [P1]-style citation tokens. */
function parseCitations(text: string) {
  return text.split(/(\[P\d+\])/g);
}

/** Ask AI chat screen: intelligent answers from live feed & general knowledge with streaming. */
export default function AskScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const {posts} = usePosts();
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({animated: true});
    });
  };

  const clearChat = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setBusy(false);
    setMessages([GREETING]);
  };

  const respond = async (question: string) => {
    const msgId = 'a' + Date.now();
    setBusy(true);

    // Initial placeholder while AI is thinking
    setMessages(prev => [
      ...prev,
      {id: msgId, role: 'ai', text: 'Thinking...', refs: []},
    ]);
    scrollToBottom();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      const {answer, refs} = await askAiQuestion(question, posts);

      // Stream words smoothly for a live typing effect
      const words = (answer || '').trim().split(/\s+/).filter(Boolean);
      if (words.length <= 1) {
        setMessages(prev =>
          prev.map(m => (m.id === msgId ? {...m, text: answer, refs} : m)),
        );
        setBusy(false);
        return;
      }

      let i = 0;
      setMessages(prev =>
        prev.map(m => (m.id === msgId ? {...m, text: words[0] || ''} : m)),
      );

      timerRef.current = setInterval(() => {
        i += 1;
        const partial = words.slice(0, i).join(' ');
        const done = i >= words.length;

        setMessages(prev =>
          prev.map(m =>
            m.id === msgId
              ? {...m, text: partial, refs: done ? refs : undefined}
              : m,
          ),
        );
        scrollToBottom();

        if (done) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setBusy(false);
        }
      }, 35);
    } catch {
      setMessages(prev =>
        prev.map(m =>
          m.id === msgId
            ? {
                ...m,
                text: "I couldn't retrieve an answer right now. Please try asking again!",
              }
            : m,
        ),
      );
      setBusy(false);
    }
  };

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text || busy) {
      return;
    }
    setInput('');
    setMessages(prev => [...prev, {id: 'u' + Date.now(), role: 'user', text}]);
    scrollToBottom();
    setTimeout(() => respond(text), 200);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Screen Header */}
      <View style={[styles.header, {paddingTop: insets.top + 6}]}>
        <View style={styles.sparkleBadge}>
          <Icon name="sparkle" size={18} color={C.white} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Ask AI</Text>
          <Text style={styles.subtitle}>Powered by Reddit community discussions & knowledge</Text>
        </View>
        {messages.length > 1 && (
          <TouchableOpacity
            onPress={clearChat}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={item => item.id}
        onContentSizeChange={scrollToBottom}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({item}) => {
          if (item.role === 'user') {
            return (
              <View style={styles.userBubble}>
                <Text style={styles.userText}>{item.text}</Text>
              </View>
            );
          }
          const refs = item.refs ?? [];
          const parts = parseCitations(item.text);
          return (
            <View style={styles.aiBubble}>
              <View style={styles.aiHeaderRow}>
                <Icon name="sparkle" size={14} color={C.orange} />
                <Text style={styles.aiLabel}>Reddit AI</Text>
              </View>
              <Text style={styles.aiText}>
                {parts.map((part, idx) => {
                  const match = part.match(/^\[P(\d+)\]$/);
                  if (match) {
                    const n = Number(match[1]);
                    const postId = refs[n - 1];
                    return (
                      <Text
                        key={idx}
                        style={styles.citation}
                        onPress={() =>
                          postId &&
                          navigation.navigate('PostDetail', {postId})
                        }>
                        {' '}[P{n}]{' '}
                      </Text>
                    );
                  }
                  return <Text key={idx}>{part}</Text>;
                })}
              </Text>
            </View>
          );
        }}
        ListFooterComponent={
          messages.length <= 1 ? (
            <View style={styles.suggestions}>
              <Text style={styles.suggestionsHeading}>Suggested Questions</Text>
              {SUGGESTIONS.map(s => (
                <TouchableOpacity
                  key={s}
                  style={styles.suggestion}
                  activeOpacity={0.8}
                  onPress={() => send(s)}>
                  <Icon name="search" size={14} color={C.faint} />
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : undefined
        }
      />

      {/* Input Composer Field */}
      <View style={[styles.inputBar, {paddingBottom: Math.max(insets.bottom, 8) + 4}]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask AI anything..."
          placeholderTextColor={C.faint}
          style={styles.input}
          returnKeyType="send"
          onSubmitEditing={() => send(input)}
          editable={!busy}
        />
        <TouchableOpacity
          onPress={() => send(input)}
          disabled={busy || !input.trim()}
          activeOpacity={0.8}
          style={[styles.sendBtn, (busy || !input.trim()) && styles.sendDisabled]}>
          <Icon name="up" size={20} color={C.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    gap: 10,
    backgroundColor: C.white,
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
  },
  sparkleBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: C.text,
  },
  subtitle: {
    fontSize: 11,
    color: C.sub,
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: C.pill,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.sub,
  },
  list: {
    padding: 12,
    paddingBottom: 20,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: C.orange,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '82%',
    marginVertical: 5,
  },
  userText: {
    color: C.white,
    fontSize: 14,
    lineHeight: 20,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: C.card,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: C.hairline,
    paddingHorizontal: 14,
    paddingVertical: 12,
    maxWidth: '92%',
    marginVertical: 5,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  aiLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: C.orange,
  },
  aiText: {
    color: C.text,
    fontSize: 14,
    lineHeight: 21,
  },
  citation: {
    color: C.orange,
    backgroundColor: C.orangeSoft,
    fontWeight: '800',
    fontSize: 12,
    borderRadius: 4,
    overflow: 'hidden',
  },
  suggestions: {
    marginTop: 14,
    gap: 8,
  },
  suggestionsHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: C.faint,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.hairline,
    backgroundColor: C.card,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
    backgroundColor: C.white,
  },
  input: {
    flex: 1,
    backgroundColor: C.pill,
    borderRadius: 999,
    paddingHorizontal: 16,
    height: 42,
    fontSize: 14,
    color: C.text,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    backgroundColor: C.pill,
  },
});
