import React from 'react';
import {Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {usePosts} from '../context/PostsContext';
import {C} from '../theme';

/** Sign-in gate. Mock auth for the UI demo — no Firebase wired yet. */
export default function SignInScreen() {
  const {signIn} = usePosts();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, {paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20}]}>
      <View style={styles.hero}>
        <Image
          source={require('../assets/reddit-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View>
        <Text style={styles.headline}>Log in to Reddit.</Text>
        <Text style={styles.sub}>
          See today's top discussions from your favorite communities.
        </Text>

        <TouchableOpacity style={styles.googleBtn} onPress={signIn} activeOpacity={0.8}>
          <Image source={require('../assets/google-g.png')} style={styles.gIcon} />
          <Text style={styles.googleText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.guestBtn} onPress={signIn} activeOpacity={0.8}>
          <Text style={styles.guestText}>Continue as guest</Text>
        </TouchableOpacity>

        <Text style={styles.terms}>
          Class demo of a Reddit-inspired app.{'\n'}Reddit name and logo are trademarks of
          Reddit Inc. — not published, coursework use only.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.white,
    paddingHorizontal: 24,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 300,
    height: 103,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
  },
  sub: {
    marginTop: 6,
    marginBottom: 24,
    fontSize: 14,
    color: C.sub,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 50,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.hairline,
    backgroundColor: C.white,
  },
  gIcon: {
    width: 20,
    height: 20,
  },
  googleText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  guestBtn: {
    marginTop: 12,
    height: 50,
    borderRadius: 999,
    backgroundColor: C.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.white,
  },
  terms: {
    marginTop: 20,
    fontSize: 11,
    lineHeight: 16,
    color: C.faint,
    textAlign: 'center',
  },
});
