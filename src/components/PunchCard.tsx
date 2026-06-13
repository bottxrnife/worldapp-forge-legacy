import React from 'react';
import { View } from 'react-native';
import { LoyaltyRecord } from '../state/store';
import { C } from '../theme';
import { Pulse, Txt } from './ui';

/**
 * Loyalty punch card — renders the `punchCard` manifest component.
 * Always drawn on the dark ink panel so it reads as a physical pass in
 * both themes (same precedent as the Scan viewfinder panel).
 */
export function PunchCard({
  brand,
  total,
  reward,
  record,
  onchain,
}: {
  brand: string;
  total: number;
  reward: string;
  record: LoyaltyRecord;
  onchain?: boolean;
}) {
  const punches = Math.min(record.punches, total);
  const full = punches >= total;
  const remaining = total - punches;

  return (
    <View style={{ backgroundColor: C.inkPanel, borderRadius: 22, padding: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt size={11} w={700} color="#B8C6F2" ls={0.06} style={{ textTransform: 'uppercase' }}>
            {brand}
          </Txt>
          <Txt size={16} w={800} color={C.white} style={{ marginTop: 3 }}>
            {punches} of {total} stamps
          </Txt>
        </View>
        <View
          style={{
            backgroundColor: 'rgba(255,255,255,0.12)',
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
          const dot = (
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: filled ? C.accent : 'rgba(255,255,255,0.07)',
                borderWidth: filled ? 0 : 1.5,
                borderColor: 'rgba(255,255,255,0.22)',
              }}
            >
              <Txt size={filled ? 17 : 12.5} w={700} color={filled ? C.white : '#8C9BCB'}>
                {filled ? '🍔' : i + 1}
              </Txt>
            </View>
          );
          return isNext ? (
            <Pulse key={i} borderRadius={20}>
              {dot}
            </Pulse>
          ) : (
            <View key={i}>{dot}</View>
          );
        })}
      </View>

      <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginTop: 16 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
        <Txt size={12.5} color="#B8C6F2" lh={1.4} style={{ flex: 1, minWidth: 0 }}>
          {full
            ? `Card full — your free ${reward} is ready 🎉`
            : `${remaining} more ${remaining === 1 ? 'visit' : 'visits'} until a free ${reward}`}
        </Txt>
        {record.redeemed > 0 && (
          <Txt size={11.5} w={600} color="#8C9BCB" style={{ marginLeft: 10 }}>
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
            backgroundColor: onchain ? C.successStrong : '#8C9BCB',
          }}
        />
        <Txt size={11} w={600} color="#8C9BCB">
          {onchain ? 'Synced from your ENS profile' : 'Saved on device'}
        </Txt>
      </View>
    </View>
  );
}
