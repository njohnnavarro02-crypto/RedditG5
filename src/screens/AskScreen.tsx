import React, {useEffect, useRef, useState} from 'react';
import {
  FlatList,
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
import {AI_ANSWERS} from '../data/mock';
import type {RootStackParamList} from '../navigation/types';
import {C} from '../theme';
import {ChatMessage} from '../types';

const GREETING: ChatMessage = {
  id: 'm0',
  role: 'ai',
  text: "Hi! I've read today's top posts across your communities. Ask me what's trending, or tap a suggestion below.",
  refs: [],
};

const SUGGESTIONS = [
  "What's trending right now?",
  'Summarize r/technology today',
  'Any good learning posts?',
];

/** Split text into plain parts and [P1]-style citation tokens. */
function parseCitations(text: string) {
  return text.split(/(\[P\d+\])/g);
}

function pickAnswer(q: string, counter: number) {
  const s = q.toLowerCase();
  if (s.includes('trending') || s.includes('top') || s.includes('happening')) {
    return AI_ANSWERS[0];
  }
  if (s.includes('technolog')) {
    return AI_ANSWERS[1];
  }
  if (s.includes('learn') || s.includes('course') || s.includes('study')) {
    return AI_ANSWERS[2];
  }
  return AI_ANSWERS[counter % AI_ANSWERS.length];
}

/** "Ask the Feed" chat: mock word-by-word streaming with tappable citations. */
export default function AskScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const counterRef = useRef(0);
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

  const respond = (question: string) => {
    const answer = pickAnswer(question, counterRef.current);
    counterRef.current += 1;
    const msgId = 'a' + Date.now();

    setBusy(true);
    setMessages(prev => [...prev, {id: msgId, role: 'ai', text: '', refs: []}]);

    const words = answer.text.split(' ');
    let i = 0;
    timerRef.current = setInterval(() => {
      i += 1;
      const partial = words.slice(0, i).join(' ');
      const done = i >= words.length;
      setMessages(prev =>
        prev.map(m =>
          m.id === msgId
            ? {...m, text: partial, refs: done ? answer.refs : undefined}
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
    }, 55);
  };

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text || busy) {
      return;
    }
    setInput('');
    setMessages(prev => [...prev, {id: 'u' + Date.now(), role: 'user', text}]);
    scrollToBottom();
    setTimeout(() => respond(text), 450);
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, {paddingTop: insets.top + 6}]}>
        <Icon name="sparkle" size={20} color={C.orange} />
        <View style={styles.headerText}>
          <Text style={styles.title}>Ask the Feed</Text>
          <Text style={styles.subtitle}>AI demo · answers from today's top posts</Text>
        </View>
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
              {SUGGESTIONS.map(s => (
                <TouchableOpacity
                  key={s}
                  style={styles.suggestion}
                  activeOpacity={0.8}
                  onPress={() => send(s)}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : undefined
        }
      />

      <View style={[styles.inputBar, {paddingBottom: Math.max(insets.bottom, 8) + 4}]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask the feed..."
          placeholderTextColor={C.faint}
          style={styles.input}
          onSubmitEditing={() => send(input)}
        />
        <TouchableOpacity
          onPress={() => send(input)}
          disabled={busy || !input.trim()}
          activeOpacity={0.8}
          style={[styles.sendBtn, (busy || !input.trim()) && styles.sendDisabled]}>
          <Icon name="up" size={20} color={C.white} />
        </TouchableOpacity>
      </View>
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
    gap: 10,
    backgroundColor: C.white,
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
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
  list: {
    padding: 12,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: C.orange,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '80%',
    marginVertical: 4,
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
    paddingVertical: 10,
    maxWidth: '90%',
    marginVertical: 4,
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
  },
  suggestions: {
    marginTop: 10,
    gap: 8,
  },
  suggestion: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.hairline,
    backgroundColor: C.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
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
    paddingHorizontal: 14,
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
