import React, {useState} from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import WebView from 'react-native-webview';
import Icon from './Icon';
import {C} from '../theme';

type Props = {
  visible: boolean;
  videoUrl?: string;
  onClose: () => void;
};

export default function VideoPlayerModal({visible, videoUrl, onClose}: Props) {
  const [loading, setLoading] = useState(true);

  if (!videoUrl) return null;

  const isYouTube =
    videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');

  let htmlContent = '';
  if (isYouTube) {
    let videoId = '';
    if (videoUrl.includes('youtu.be/')) {
      videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0] || '';
    } else if (videoUrl.includes('v=')) {
      videoId = videoUrl.split('v=')[1]?.split('&')[0] || '';
    }
    htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #000; overflow: hidden; display: flex; align-items: center; justify-content: center; }
    iframe { width: 100%; height: 100%; border: none; }
  </style>
</head>
<body>
  <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1" allow="autoplay; fullscreen" allowfullscreen></iframe>
</body>
</html>`;
  } else {
    htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #000; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    video { width: 100%; max-height: 100%; object-fit: contain; background: #000; }
  </style>
</head>
<body>
  <video src="${videoUrl}" controls autoplay playsinline webkit-playsinline preload="auto"></video>
</body>
</html>`;
  }

  const handleOpenBrowser = async () => {
    try {
      await Linking.openURL(videoUrl);
    } catch {
      // Ignored
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Icon name="close" size={24} color={C.white} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            Playing Video Clip
          </Text>
          <TouchableOpacity
            style={styles.openExternalBtn}
            onPress={handleOpenBrowser}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Icon name="share" size={18} color={C.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.playerContainer}>
          <WebView
            source={{html: htmlContent}}
            allowsFullscreenVideo={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            originWhitelist={['*']}
            mixedContentMode="always"
            onLoadEnd={() => setLoading(false)}
            style={styles.webview}
          />
          {loading && (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color={C.orange} />
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#111111',
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  openExternalBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
  },
  playerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loaderWrap: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
});
