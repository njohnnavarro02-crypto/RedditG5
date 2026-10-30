import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from './Icon';
import {C} from '../theme';
import {MyVote} from '../types';
import {fmt} from '../utils';

type Props = {
  score: number;
  myVote: MyVote;
  onUp: () => void;
  onDown: () => void;
  small?: boolean;
};

/** The rounded vote pill with up arrow, score, and down arrow. */
export default function VotePill({score, myVote, onUp, onDown, small = false}: Props) {
  const iconSize = small ? 16 : 18;
  const scoreColor = myVote === 1 ? C.orange : myVote === -1 ? C.blue : C.text;
  return (
    <View style={[styles.pill, small && styles.pillSmall]}>
      <TouchableOpacity
        onPress={onUp}
        hitSlop={{top: 10, bottom: 10, left: 10, right: 6}}
        activeOpacity={0.6}>
        <Icon name="up" size={iconSize} color={myVote === 1 ? C.orange : C.faint} />
      </TouchableOpacity>
      <Text style={[styles.score, {color: scoreColor}, small && styles.scoreSmall]}>
        {fmt(score)}
      </Text>
      <TouchableOpacity
        onPress={onDown}
        hitSlop={{top: 10, bottom: 10, left: 6, right: 10}}
        activeOpacity={0.6}>
        <Icon name="down" size={iconSize} color={myVote === -1 ? C.blue : C.faint} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.pill,
    borderRadius: 999,
    paddingHorizontal: 10,
    height: 32,
    gap: 8,
  },
  pillSmall: {
    height: 28,
    paddingHorizontal: 8,
    gap: 6,
  },
  score: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 30,
    textAlign: 'center',
  },
  scoreSmall: {
    fontSize: 11,
    minWidth: 24,
  },
});
