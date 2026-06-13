import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { dappEmoji } from '../dappStyle';
import { LoyaltyRecord } from '../state/store';
import { C } from '../theme';
import { Overline, Pulse, Txt } from './ui';

/** A single stamp dot. The most-recently-earned stamp "lands" with a spring pop. */
function Stamp({
  filled,
  label,
  emoji,
  landed,
}: {
  filled: boolean;
  label: string;
  emoji: string;
  landed: boolean;
}) {
  const v = useRef(new Animated.Value(landed ? 0.4 : 1)).current;
  useEffect(() => {
    if (!landed) return;
    v.setValue(0.4);
    Animated.spring(v, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 14 }).start();
  }, [landed, v]);
  return (
    <Animated.View
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: filled ? C.accent : 'rgba(255,255,255,0.07)',
        borderWidth: filled ? 0 : 1.5,
        borderColor: 'rgba(255,255,255,0.22)',
        transform: [{ scale: v }],
      }}
    >
      <Txt size={filled ? 17 : 12.5} w={700} color={filled ? C.white : C.onInkFaint}>
        {filled ? emoji : label}
      </Txt>
    </Animated.View>
  );
}

/**
 * Loyalty punch card — renders the `punchCard` manifest component.
 * Always drawn on the dark ink panel so it reads as a physical pass in both
 * themes. The stamp glyph is the dapp's own emoji (not a hardcoded burger), and
 * a freshly-earned stamp animates in.
 */
export function PunchCard({
  brand,
  ens,
  category,
  total,
  reward,
  record,
  onchain,
}: {
  brand: string;
  ens: string;
  category?: string;
  total: number;
  reward: string;
  record: LoyaltyRecord;
  onchain?: boolean;
}) {
  const punches = Math.min(record.punches, total);
  const full = punches >= total;
  const remaining = total - punches;
  const emoji = dappEmoji(ens, category);

  // Detect the stamp that was just earned (punches increased since last render)
  // so only that dot pops, not the whole grid.
  const prevPunches = useRef(punches);
  const landedIndex = punches > prevPunches.current ? punches - 1 : -1;
  useEffect(() => {
    prevPunches.current = punches;
  }, [punches]);

  return (
    <View style={{ backgroundColor: C.inkPanel, borderRadius: 22, padding: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Overline color={C.onInkLabel} ls={0.06} numberOfLines={1}>
            {brand}
          </Overline>
          <Txt size={16} w={800} color={C.white} style={{ marginTop: 3 }}>
            {punches} of {total} stamps
          </Txt>
        </View>
        <View
          style={{
            backgroundColor: C.onInkChip,
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Txt size={12} w={700} color={C.white}>
            ★ {record.points.toLocaleString()} pts
          </Txt>
        </View>
      </View>

      {/* stamp grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 16 }}>
        {Array.from({ length: total }, (_, i) => {
          const filled = i < punches;
          const isNext = i === punches && !full;
          const stamp = (
            <Stamp filled={filled} label={String(i + 1)} emoji={emoji} landed={i === landedIndex} />
          );
          return isNext ? (
            <Pulse key={i} borderRadius={20}>
              {stamp}
            </Pulse>
          ) : (
            <View key={i}>{stamp}</View>
          );
        })}
      </View>

      <View style={{ height: 1, backgroundColor: C.onInkHair, marginTop: 16 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
        <Txt size={12.5} color={C.onInkLabel} lh={1.4} style={{ flex: 1, minWidth: 0 }}>
          {full
            ? `Card full — your free ${reward} is ready 🎉`
            : `${remaining} more ${remaining === 1 ? 'visit' : 'visits'} until a free ${reward}`}
        </Txt>
        {record.redeemed > 0 && (
          <Txt size={11.5} w={600} color={C.onInkFaint} style={{ marginLeft: 10 }}>
            {record.redeemed} redeemed
          </Txt>
        )}
      </View>
      {/* where the punch count lives: synced from the user's ENS profile, else local */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: onchain ? C.successStrong : C.onInkFaint,
          }}
        />
        <Txt size={11} w={600} color={C.onInkFaint}>
          {onchain ? 'Synced from your ENS profile' : 'Saved on device'}
        </Txt>
      </View>
    </View>
  );
}
