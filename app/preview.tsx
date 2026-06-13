import { Redirect, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';
import { BackButton, IconTile, PrimaryButton, Screen, Txt } from '../src/components/ui';
import { useApp } from '../src/state/store';
import { C } from '../src/theme';

export default function Preview() {
  const router = useRouter();
  const draft = useApp((s) => s.draft);
  useApp((s) => s.themeMode); // repaint on theme toggle

  if (!draft) return <Redirect href="/assistant" />;

  const amount = draft.components.find((c) => c.type === 'amountInput') as
    | { default: string; token: string }
    | undefined;
  const recipient = draft.components.find((c) => c.type === 'recipient') as
    | { value: string }
    | undefined;
  const submit = draft.components.find((c) => c.type === 'submitButton') as
    | { label: string }
    | undefined;
  const monogram = draft.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const summaryRows: Array<[string, string, string]> = [
    ['Identity', draft.ensName, C.blueLink],
    [
      'Workflow',
      amount ? `${amount.token} any chain → ${recipient?.value ?? 'treasury'}` : 'Custom flow',
      C.text,
    ],
    [
      'Access',
      draft.permissions.requiresWorldId ? 'World ID required' : 'Open to everyone',
      draft.permissions.requiresWorldId ? C.success : C.text,
    ],
  ];

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <BackButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/assistant'))} />
        <Txt size={16} w={800}>
          Generated dapp
        </Txt>
      </View>

      <View style={{ marginTop: 16 }}>
        <Txt size={22} w={800} ls={-0.015}>
          {draft.name}
        </Txt>
        <Txt size={14} color={C.text2} lh={1.5} style={{ marginTop: 5 }}>
          {draft.description}
        </Txt>
      </View>

      {/* live preview frame */}
      <View style={{ backgroundColor: C.blueSoft, borderRadius: 28, padding: 18, marginTop: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 11 }}>
          <Txt size={10.5} w={700} color={C.blueMeta} ls={0.08} style={{ textTransform: 'uppercase' }}>
            Live preview
          </Txt>
          <Txt size={10.5} w={700} color={C.blueMeta} ls={0.08} style={{ textTransform: 'uppercase' }}>
            interactive
          </Txt>
        </View>
        <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <IconTile label={monogram} size={34} radius={11} fontSize={12} />
            <Txt size={14} w={800}>
              {draft.name.split(' ').slice(0, 2).join(' ')}
            </Txt>
          </View>
          {amount && (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 12,
                marginTop: 8,
                borderBottomWidth: 1,
                borderBottomColor: C.dividerSoft,
              }}
            >
              <Txt size={12.5} color={C.text2}>
                Amount
              </Txt>
              <Txt size={13} w={700}>
                ${amount.default} {amount.token}
              </Txt>
            </View>
          )}
          {recipient && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 }}>
              <Txt size={12.5} color={C.text2}>
                Destination
              </Txt>
              <Txt size={13} w={700} color={C.blueLink}>
                {recipient.value}
              </Txt>
            </View>
          )}
          <Pressable
            onPress={() => router.push('/runtime/draft')}
            style={{
              backgroundColor: C.cta,
              borderRadius: 11,
              padding: 11,
              alignItems: 'center',
              marginTop: 6,
            }}
          >
            <Txt size={13} w={700} color={C.ctaText}>
              {submit?.label ?? 'Run'}
            </Txt>
          </Pressable>
        </View>
      </View>

      <View style={{ gap: 8, marginTop: 12 }}>
        {summaryRows.map(([label, value, color]) => (
          <View
            key={label}
            style={{
              backgroundColor: C.surface,
              borderRadius: 18,
              paddingVertical: 15,
              paddingHorizontal: 17,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Txt size={11} w={700} color={C.text3} ls={0.05} style={{ textTransform: 'uppercase' }}>
              {label}
            </Txt>
            <Txt size={13} w={700} color={color} numberOfLines={1} style={{ flexShrink: 1 }}>
              {value}
            </Txt>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
        <Pressable
          onPress={() => router.replace('/assistant')}
          style={{ flex: 1, backgroundColor: C.surface, borderRadius: 14, padding: 14, alignItems: 'center' }}
        >
          <Txt size={13.5} w={700} color={C.textNote}>
            Edit with assistant
          </Txt>
        </Pressable>
        <Pressable
          onPress={() => router.push('/runtime/draft')}
          style={{ flex: 1, backgroundColor: C.surface, borderRadius: 14, padding: 14, alignItems: 'center' }}
        >
          <Txt size={13.5} w={700} color={C.textNote}>
            Test dapp
          </Txt>
        </Pressable>
      </View>
      <PrimaryButton label="Publish" onPress={() => router.push('/publish')} style={{ marginTop: 8 }} />
    </Screen>
  );
}
