import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, View } from 'react-native';
import { BackButton, Chip, IconTile, PrimaryButton, Screen, Txt } from '../../src/components/ui';
import { findListing, useApp } from '../../src/state/store';
import { C } from '../../src/theme';

function MicroLabel({ text, color = C.text3 }: { text: string; color?: string }) {
  return (
    <Txt size={11} w={700} color={color} ls={0.05} style={{ textTransform: 'uppercase' }}>
      {text}
    </Txt>
  );
}

export default function Detail() {
  const router = useRouter();
  const { ens } = useLocalSearchParams<{ ens: string }>();
  useApp((s) => s.themeMode); // repaint on theme toggle
  const listing = findListing(ens);
  const m = listing.manifest;

  const showTechnical = () =>
    Alert.alert(
      'Technical details',
      [
        `ENS: ${m.ensName}`,
        `Manifest v${m.version} · flow ${m.workflow.flowId}`,
        `Text records: ${Object.keys(m.ensTextRecords).join(', ')}`,
        `Provider: ${m.workflow.provider}`,
      ].join('\n')
    );

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/store'))} />
        <Pressable onPress={showTechnical}>
          <Txt size={13} w={600} color={C.text2}>
            View technical details
          </Txt>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 18 }}>
        <IconTile label={listing.monogram} size={64} radius={21} fontSize={21} />
        <View style={{ flex: 1 }}>
          <Txt size={21} w={800} ls={-0.01}>
            {m.name}
          </Txt>
          <Txt size={13} w={600} color={C.blueLink} style={{ marginTop: 3 }}>
            {m.ensName} · by {m.creator}
          </Txt>
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
        <Chip label="ENS verified" bg={C.blueSoft} color={C.blueLink} size={11} py={5} />
        {m.trust.worldVerifiedCreator && (
          <Chip label="✓ World verified creator" bg={C.successBg} color={C.success} size={11} py={5} />
        )}
        {m.trust.simulated && <Chip label="Flow simulated" bg={C.warnBg} color={C.warn} size={11} py={5} />}
        {m.trust.openSource && (
          <Chip label="Open source" bg={C.dividerSoft} color={C.text2} size={11} py={5} />
        )}
      </View>

      {/* What this dapp does */}
      <View style={{ backgroundColor: C.surface, borderRadius: 22, padding: 18, marginTop: 16 }}>
        <MicroLabel text="What this dapp does" />
        <Txt size={14.5} color={C.textBody} lh={1.55} style={{ marginTop: 8 }}>
          {m.ensName.startsWith('hackdues.') ? (
            <>
              You pay <Txt size={14.5} w={700} color={C.textBody}>$5 USDC from any chain</Txt>, it lands in
              the team treasury at <Txt size={14.5} w={700} color={C.textBody}>team.eth</Txt>, and you’re
              marked as paid on the member list. That’s it.
            </>
          ) : (
            m.description + ' ' + m.outcome
          )}
        </Txt>
      </View>

      {/* Permissions */}
      <View
        style={{
          backgroundColor: C.surface,
          borderRadius: 22,
          padding: 18,
          marginTop: 10,
          borderWidth: 1.5,
          borderColor: C.blueSoft,
        }}
      >
        <MicroLabel text="Permissions requested" color={C.blueLink} />
        <View style={{ gap: 10, marginTop: 12 }}>
          {m.permissions.plainEnglish.map((p, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: C.dividerSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 1,
                }}
              >
                <Txt size={11} w={700} color={C.text2}>
                  {i + 1}
                </Txt>
              </View>
              <Txt size={14} color={C.textBody} style={{ flex: 1 }}>
                {p}
              </Txt>
            </View>
          ))}
        </View>
        <View style={{ height: 1, backgroundColor: C.divider, marginVertical: 14 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Txt size={13} color={C.text2}>
            Spending cap
          </Txt>
          <Txt size={15} w={800}>
            {m.permissions.spendingCap.includes('USDC')
              ? `$${parseFloat(m.permissions.spendingCap).toFixed(2)}`
              : m.permissions.spendingCap}
          </Txt>
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 8,
          }}
        >
          <Txt size={13} color={C.text2}>
            Before execution
          </Txt>
          <Txt size={13} w={700} color={C.success}>
            You confirm first
          </Txt>
        </View>
      </View>

      {/* Workflow preview */}
      <View style={{ backgroundColor: C.surface, borderRadius: 22, padding: 18, marginTop: 10 }}>
        <MicroLabel text="Workflow preview" />
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 13, flexWrap: 'wrap' }}
        >
          {(m.ensName.startsWith('hackdues.')
            ? ['USDC, any chain', 'LI.FI route', 'team.eth', 'Marked paid']
            : m.workflow.steps.map((s) => s.label.split(' ').slice(0, 3).join(' '))
          ).map((label, i, arr) => (
            <React.Fragment key={i}>
              <Chip
                label={label}
                bg={i === arr.length - 1 ? C.successBg : C.blueSoft}
                color={i === arr.length - 1 ? C.success : C.blueBody}
                size={12}
                px={12}
                py={7}
              />
              {i < arr.length - 1 && (
                <Txt size={13} color={C.text3}>
                  →
                </Txt>
              )}
            </React.Fragment>
          ))}
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          marginTop: 14,
          paddingHorizontal: 4,
        }}
      >
        <Txt size={13.5} w={700}>
          ★ {listing.rating}
        </Txt>
        <Txt size={13} color={C.text2}>
          {listing.runs} runs · {listing.reviews} verified reviews · one review per human
        </Txt>
      </View>

      <PrimaryButton
        label="Run dapp"
        onPress={() => router.push(`/runtime/${m.ensName}`)}
        style={{ marginTop: 16 }}
      />
    </Screen>
  );
}
