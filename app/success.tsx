import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';
import { FadeUp, Txt } from '../src/components/ui';
import { useApp } from '../src/state/store';
import { C } from '../src/theme';

export default function Success() {
  const router = useRouter();
  const draft = useApp((s) => s.draft);
  const live = useApp((s) => s.draftPublishedLive);
  useApp((s) => s.themeMode); // repaint on theme toggle

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FadeUp
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 36,
        }}
      >
        <View
          style={{
            width: 74,
            height: 74,
            borderRadius: 37,
            backgroundColor: C.successBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Txt size={30} w={700} color={C.success}>
            ✓
          </Txt>
        </View>
        <Txt size={31} w={800} ls={-0.02} style={{ marginTop: 26 }}>
          Published.
        </Txt>
        <Txt size={15} color={C.text2} lh={1.6} center style={{ marginTop: 12 }}>
          Your dapp is live at{'\n'}
          <Txt size={15} w={700} color={C.blueLink}>
            {draft?.ensName ?? ''}
          </Txt>
        </Txt>
        {!live && (
          <Txt size={12} color={C.text3} center style={{ marginTop: 8 }}>
            ENS identity assigned · register {draft?.ensName ?? 'the name'} on-chain to resolve it live.
          </Txt>
        )}
        <Pressable
          onPress={() => router.replace('/store')}
          style={{
            backgroundColor: C.cta,
            borderRadius: 16,
            paddingVertical: 16,
            paddingHorizontal: 46,
            marginTop: 36,
          }}
        >
          <Txt size={15} w={700} color={C.ctaText}>
            Open in store
          </Txt>
        </Pressable>
        <Pressable onPress={() => router.replace('/profile')} style={{ paddingVertical: 16 }}>
          <Txt size={14} w={600} color={C.text2}>
            View profile
          </Txt>
        </Pressable>
      </FadeUp>
    </View>
  );
}
