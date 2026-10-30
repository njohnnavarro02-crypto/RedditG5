import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {COMMUNITIES} from '../data/mock';
import {C} from '../theme';

type Props = {
  communityId: string;
  size?: number;
};

/** Colored circle with the community initial, Reddit-default-avatar style. */
export default function CommunityAvatar({communityId, size = 32}: Props) {
  const community = COMMUNITIES.find(c => c.id === communityId);
  const color = community?.color ?? C.faint;
  return (
    <View
      style={[
        styles.circle,
        {width: size, height: size, borderRadius: size / 2, backgroundColor: color},
      ]}>
      <Text style={{color: '#FFFFFF', fontSize: size * 0.5, fontWeight: '800'}}>
        {communityId.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
