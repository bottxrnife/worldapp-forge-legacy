import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { Copy, Gift, Moon, Receipt, Sparkles, Sun } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Chip, IconTile, ListRow, Screen, SectionHeader, Txt } from '../src/components/ui';
import { AgentKitStatus, getAgentKitStatus, runHumanBackedTask } from '../src/services/agentkit';
import { AgentProfile, getAgentProfile } from '../src/services/identity';
import { getWalletSnapshot } from '../src/services/wallet';
import { useApp } from '../src/state/store';
import { C } from '../src/theme';

function AgentCard({
  ens,
  status,
  chips,
}: {
  ens: string;
  status: 'Active' | 'Paused';
  chips: Array<{ label: string; danger?: boolean }>;
}) {
  // ENSIP-25/26: resolve the agent's on-chain identity (address + agent-context)
  // live via the Universal Resolver — agents are discoverable & verifiable by ENS.
  const [id, setId] = useState<AgentProfile | null>(null);
  useEffect(() => {
    getAgentProfile(ens)
      .then(setId)
      .catch(() => {});
  }, []);
  const short = id?.address ? `${id.address.slice(0, 6)}…${id.address.slice(-4)}` : null;

  return (
    <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: C.inkPanel,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Sparkles size={15} color={C.white} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt size={14.5} w={700} numberOfLines={1}>
            {ens}
          </Txt>
          <Txt
            size={12}
            color={id?.verified ? C.success : C.text2}
            style={{ marginTop: 1 }}
            numberOfLines={1}
          >
            {id?.verified ? `✓ ENS verified · ${short}` : 'Human-backed · ENS identity'}
          </Txt>
        </View>
        <Chip
          label={status}
          bg={status === 'Active' ? C.successBg : C.dividerSoft}
          color={status === 'Active' ? C.success : C.text2}
          size={10.5}
          px={9}
          py={4}
        />
      </View>
      {id?.context ? (
        <Txt size={11.5} color={C.text2} lh={1.4} style={{ marginTop: 9 }} numberOfLines={2}>
          {id.context}
        </Txt>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 5, marginTop: 11, flexWrap: 'wrap' }}>
        {chips.map((c) => (
          <Chip
            key={c.label}
            label={c.label}
            bg={c.danger ? C.dangerBg : C.bg}
            color={c.danger ? C.danger : C.textNote}
            size={10.5}
            w={600}
            px={9}
            py={4}
          />
        ))}
      </View>
    </View>
  );
}

/**
 * AgentKit (Track A) card — reads the free-trial status from the World AgentKit
 * resource server (server/agentkit) over plain HTTP and lets the user fire a
 * human-backed agent call. The AgentKit SDK runs server-side, never in the app.
 */
function AgentKitCard() {
  const [status, setStatus] = useState<AgentKitStatus | null>(null);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    getAgentKitStatus()
      .then(setStatus)
      .catch(() => {});
  }, []);
  const run = async () => {
    if (running) return;
    setRunning(true);
    try {
      const r = await runHumanBackedTask();
      Alert.alert(
        r.outcome === 'unlocked'
          ? 'Free-trial use ✓'
          : r.outcome === 'payment'
            ? 'Register your agent'
            : 'AgentKit offline',
        r.detail
      );
    } finally {
      setRunning(false);
    }
  };
  return (
    <View style={{ backgroundColor: C.inkPanel, borderRadius: 20, padding: 16, marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Txt size={11} w={700} color="#B8C6F2" ls={0.06} style={{ textTransform: 'uppercase' }}>
          Human-backed agent · AgentKit
        </Txt>
        <View
          style={{
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <Txt size={10.5} w={700} color={status?.reachable ? C.successStrong : '#9FB0DA'}>
            {status?.reachable ? 'online' : status ? 'offline' : '…'}
          </Txt>
        </View>
      </View>
      <Txt size={12.5} color={C.white} lh={1.45} style={{ marginTop: 8, opacity: 0.92 }}>
        {status
          ? `${status.freeUses} free uses on ${status.networks.join(' + ')}, then ${status.price}/call. `
          : 'Loading… '}
        World ID proves the agent is human-backed (x402 free-trial).
      </Txt>
      <Pressable
        onPress={run}
        style={{
          backgroundColor: 'rgba(255,255,255,0.12)',
          borderRadius: 13,
          paddingVertical: 11,
          alignItems: 'center',
          marginTop: 12,
        }}
      >
        <Txt size={13.5} w={700} color={C.white}>
          {running ? 'Calling agent…' : 'Run a human-backed task'}
        </Txt>
      </Pressable>
    </View>
  );
}

export default function Profile() {
  const router = useRouter();
  const {
    verified,
    verifiedSimulated,
    builderCredits,
    publishedCount,
    listings,
    savedEns,
    wallet,
    setWallet,
    themeMode,
    setThemeMode,
  } = useApp();
  const [loadingWallet, setLoadingWallet] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoadingWallet(true);
    getWalletSnapshot()
      .then((w) => alive && setWallet(w))
      .catch(() => {})
      .finally(() => alive && setLoadingWallet(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const created = listings.filter((l) => l.manifest.creator === 'william.eth');
  const saved = listings.filter((l) => savedEns.includes(l.manifest.ensName));

  const copyAddress = async () => {
    if (!wallet) return;
    await Clipboard.setStringAsync(wallet.address);
    Alert.alert('Copied', 'Wallet address copied. Send USDC (Base, Arbitrum, Optimism or Polygon) plus a little gas to run dapps for real.');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen padBottom={120}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
          <View
            style={{
              width: 62,
              height: 62,
              borderRadius: 31,
              backgroundColor: C.blueSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Txt size={23} w={800} color={C.blueLink}>
              W
            </Txt>
          </View>
          <View>
            <Txt size={21} w={800} ls={-0.01}>
              william.eth
            </Txt>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
              <Chip
                label={verified ? (verifiedSimulated ? '✓ World (simulated)' : '✓ World verified') : 'Not verified'}
                bg={verified ? C.successBg : C.dividerSoft}
                color={verified ? C.success : C.text2}
                size={11}
                py={5}
              />
              <Chip label="Builder" bg={C.blueSoft} color={C.blueLink} size={11} py={5} />
            </View>
          </View>
        </View>

        {/* stats */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
          {[
            [String(builderCredits), '/3', 'Builder credits'],
            [String(publishedCount), '', 'Published'],
            ['4.9', '', 'Reputation'],
          ].map(([big, small, label]) => (
            <View
              key={label}
              style={{
                flex: 1,
                backgroundColor: C.surface,
                borderRadius: 18,
                padding: 14,
                alignItems: 'center',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Txt size={19} w={800}>
                  {big}
                </Txt>
                {small ? (
                  <Txt size={13} w={600} color={C.text3}>
                    {small}
                  </Txt>
                ) : null}
              </View>
              <Txt size={11.5} color={C.text2} style={{ marginTop: 3 }}>
                {label}
              </Txt>
            </View>
          ))}
        </View>

        {/* rewards + activity quick links */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          {[
            { icon: <Gift size={16} color={C.blueLink} strokeWidth={2.2} />, label: 'Rewards', sub: 'Cards & points', to: '/rewards' },
            { icon: <Receipt size={16} color={C.blueLink} strokeWidth={2.2} />, label: 'Activity', sub: 'Your receipts', to: '/activity' },
          ].map((q) => (
            <Pressable
              key={q.label}
              onPress={() => router.push(q.to as any)}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 11,
                backgroundColor: C.surface,
                borderRadius: 18,
                padding: 14,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: C.blueSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {q.icon}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt size={14} w={700}>
                  {q.label}
                </Txt>
                <Txt size={11.5} color={C.text2} style={{ marginTop: 1 }}>
                  {q.sub}
                </Txt>
              </View>
            </Pressable>
          ))}
        </View>

        {/* embedded wallet */}
        <SectionHeader title="Wallet" size={17} link="Open" onLink={() => router.push('/wallet')} />
        <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Txt size={11} w={700} color={C.text3} ls={0.05} style={{ textTransform: 'uppercase' }}>
                Embedded wallet
              </Txt>
              <Txt size={13} w={600} color={C.blueLink} style={{ marginTop: 4 }} numberOfLines={1}>
                {wallet ? wallet.address : loadingWallet ? 'Creating wallet…' : 'Unavailable offline'}
              </Txt>
            </View>
            <Pressable onPress={copyAddress} hitSlop={8}>
              <Copy size={17} color={C.text2} strokeWidth={2} />
            </Pressable>
          </View>
          <View style={{ height: 1, backgroundColor: C.dividerSoft, marginVertical: 12 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Txt size={13} color={C.text2}>
              USDC across chains
            </Txt>
            <Txt size={15} w={800}>
              ${wallet ? wallet.totalUsdc.toFixed(2) : '0.00'}
            </Txt>
          </View>
          {wallet && wallet.totalUsdc === 0 && (
            <Txt size={12} color={C.text3} lh={1.45} style={{ marginTop: 8 }}>
              Fund this address with USDC + gas on Base, Arbitrum, Optimism or Polygon and dapps execute
              real LI.FI flows. Unfunded runs are simulated.
            </Txt>
          )}
        </View>

        <SectionHeader title="Settings" size={17} />
        <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Txt size={15} w={700}>
                Appearance
              </Txt>
              <Txt size={12.5} color={C.text2} style={{ marginTop: 2 }}>
                {themeMode === 'dark' ? 'Dark theme' : 'Light theme'}
              </Txt>
            </View>
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: C.segBg,
                borderRadius: 999,
                padding: 3,
              }}
            >
              {(['light', 'dark'] as const).map((mode) => {
                const on = themeMode === mode;
                return (
                  <Pressable
                    key={mode}
                    testID={`theme-${mode}`}
                    onPress={() => setThemeMode(mode)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      borderRadius: 999,
                      paddingVertical: 7,
                      paddingHorizontal: 13,
                      backgroundColor: on ? C.surface : 'transparent',
                    }}
                  >
                    {mode === 'light' ? (
                      <Sun size={13} color={on ? C.text : C.text3} strokeWidth={2.4} />
                    ) : (
                      <Moon size={13} color={on ? C.text : C.text3} strokeWidth={2.4} />
                    )}
                    <Txt size={12} w={on ? 700 : 600} color={on ? C.text : C.text3}>
                      {mode === 'light' ? 'Light' : 'Dark'}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <SectionHeader title="Created dapps" size={17} />
        <View style={{ gap: 8 }}>
          {created.map((l) => (
            <ListRow
              key={l.manifest.ensName}
              icon={<IconTile label={l.monogram} />}
              title={l.manifest.name}
              sub={`${l.manifest.ensName} · ${l.runs} runs`}
              right={<Chip label="Live" bg={C.successBg} color={C.success} />}
              onPress={() => router.push(`/detail/${l.manifest.ensName}`)}
            />
          ))}
          {created.length === 0 && (
            <Txt size={13} color={C.text3} style={{ paddingHorizontal: 4 }}>
              Nothing published yet — describe an idea to the assistant.
            </Txt>
          )}
        </View>

        <SectionHeader title="Saved dapps" size={17} />
        <View style={{ gap: 8 }}>
          {saved.map((l) => (
            <ListRow
              key={l.manifest.ensName}
              icon={<IconTile label={l.monogram} />}
              title={l.manifest.name}
              sub={l.manifest.creator}
              onPress={() => router.push(`/detail/${l.manifest.ensName}`)}
            />
          ))}
          {saved.length === 0 && (
            <Txt size={13} color={C.text3} style={{ paddingHorizontal: 4 }}>
              Tap the heart on any dapp to save it here.
            </Txt>
          )}
        </View>

        <SectionHeader title="Agent fleet" size={17} />
        <Txt size={12.5} color={C.text2} lh={1.45} style={{ marginTop: -4, marginBottom: 10 }}>
          Every agent is named under ENS (ENSIP-25/26) — its address and capabilities resolve
          on-chain, so agents are discoverable and verifiable by name.
        </Txt>
        <AgentKitCard />
        <View style={{ gap: 8 }}>
          <AgentCard
            ens="design.agent.dappdock.eth"
            status="Active"
            chips={[
              { label: 'Can draft' },
              { label: 'Can simulate' },
              { label: 'Cannot spend', danger: true },
            ]}
          />
          <AgentCard
            ens="payments.agent.dappdock.eth"
            status="Paused"
            chips={[{ label: 'Can prepare flows' }, { label: 'Spend needs approval', danger: true }]}
          />
        </View>
      </Screen>
    </View>
  );
}
