import React from 'react';
import {StyleSheet, Text, TouchableOpacity} from 'react-native';
import {C} from '../theme';

type Props = {
  joined: boolean;
  onPress: () => void;
  small?: boolean;
};

/** Filled orange "Join" / gray "Joined" pill button. */
export default function JoinButton({joined, onPress, small = false}: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.btn, small && styles.btnSmall, {backgroundColor: joined ? C.pill : C.orange}]}>
      <Text style={[styles.label, small && styles.labelSmall, {color: joined ? C.sub : '#FFFFFF'}]}>
        {joined ? 'Joined' : 'Join'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSmall: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  label: {
    fontWeight: '700',
    fontSize: 13,
  },
  labelSmall: {
    fontSize: 12,
  },
});
