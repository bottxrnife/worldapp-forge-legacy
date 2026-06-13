import { useRouter } from 'expo-router';
import {
  ArrowLeftRight,
  ArrowUp,
  Calendar,
  DollarSign,
  Gift,
  PartyPopper,
  Sparkles,
  Users,
} from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { TabBar } from '../src/components/TabBar';
import { Chip, ListRow, OpenPill, Screen, SearchPill, SectionHeader, Txt } from '../src/components/ui';
import { getWalletSnapshot } from '../src/services/wallet';
import { syncLoyaltyFromChain, useApp } from '../src/state/store';
import { C } from '../src/theme';

function QuickTile({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexBasis: '22%',
        flexGrow: 1,
        backgroundColor: C.surface,
        borderRadius: 20,
        paddingTop: 14,
        paddingBottom: 12,
        paddingHorizontal: 6,
        alignItems: 'center',
        gap: 8,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: C.blueSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <Txt size={12} w={600}>
        {label}
      </Txt>
    </Pressable>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const router = useRouter();
  const verified = useApp((s) => s.verified);
  const wallet = useApp((s) => s.wallet);
  const setWallet = useApp((s) => s.setWallet);
  useApp((s) => s.themeMode); // repaint on theme toggle
  const icon = (El: any, size = 16) => <El size={size} color={C.blueLink} strokeWidth={2.4} />;

  useEffect(() => {
    getWalletSnapshot()
      .then((w) => {
        setWallet(w);
        // hydrate loyalty from the user's ENS profile text record, if any
        syncLoyaltyFromChain();
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen padBottom={120}>
        {/* shared header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <Txt size={24} w={800} ls={-0.015}>
              {greeting()}, William
            </Txt>
            <View style={{ flexDirection: 'row', gap: 7, marginTop: 9 }}>
              <View
                style={{
                  backgroundColor: C.surface,
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  flexDirection: 'row',
                  gap: 6,
                  alignItems: 'center',
                }}
              >
                <Txt size={12} w={600} color={C.text2}>
                  Balance
                </Txt>
                <Txt size={12} w={700}>
                  ${wallet ? wallet.totalUsdc.toFixed(2) : '0.00'}
                </Txt>
              </View>
              <Chip
                label={verified ? '✓ World' : 'Unverified'}
                bg={verified ? C.successBg : C.dividerSoft}
                color={verified ? C.success : C.text2}
                size={12}
                px={12}
              />
              <Chip
                label="william.eth"
                bg={C.blueSoft}
                color={C.blueLink}
                size={12}
                px={12}
                onPress={() => router.replace('/profile')}
              />
            </View>
          </View>
          <Pressable
            onPress={() => router.replace('/profile')}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: C.blueSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Txt size={17} w={800} color={C.blueLink}>
              W
            </Txt>
          </Pressable>
        </View>

        <View style={{ marginTop: 16 }}>
          <SearchPill testID="home-search" placeholder="Search dapps or ask for one…" onPress={() => router.push('/search')} />
        </View>

        {/* hero card */}
        <Pressable
          onPress={() => router.push('/assistant')}
          style={{
            backgroundColor: C.blueSoft,
            borderRadius: 28,
            padding: 22,
            marginTop: 14,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              position: 'absolute',
              right: -30,
              top: -30,
              width: 130,
              height: 130,
              borderRadius: 65,
              backgroundColor: C.blueSoftDeep,
            }}
          />
          <Txt size={20} w={800} color={C.blueInk} ls={-0.01}>
            Create a dapp
          </Txt>
          <Txt size={13.5} color={C.blueMeta} lh={1.45} style={{ marginTop: 5, maxWidth: 230 }}>
            Describe an idea — the assistant designs, wires, and publishes it.
          </Txt>
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: C.cta,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 10,
              marginTop: 14,
            }}
          >
            <Txt size={13.5} w={700} color={C.ctaText}>
              Open assistant
            </Txt>
          </View>
        </Pressable>

        {/* quick actions — every tile opens a real dapp or a store category */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
          <QuickTile icon={icon(DollarSign)} label="Pay" onPress={() => router.push('/pay')} />
          <QuickTile icon={icon(ArrowLeftRight)} label="Swap" onPress={() => router.push('/detail/swap.dappdock.eth')} />
          <QuickTile icon={icon(PartyPopper, 15)} label="Lucky" onPress={() => router.push('/redpacket/new')} />
          <QuickTile icon={icon(ArrowUp)} label="Fundraise" onPress={() => router.push('/detail/fundraise.dappdock.eth')} />
          <QuickTile icon={icon(Users, 15)} label="Members" onPress={() => router.push('/detail/members.dappdock.eth')} />
          <QuickTile icon={icon(Sparkles, 15)} label="Agents" onPress={() => router.push('/store?category=Agents')} />
          <QuickTile icon={icon(Calendar, 15)} label="Events" onPress={() => router.push('/store?category=Events')} />
          <QuickTile icon={icon(Gift, 15)} label="Rewards" onPress={() => router.push('/rewards')} />
        </View>

        <SectionHeader title="Recommended dapps" link="See all" onLink={() => router.replace('/store')} />
        <View style={{ gap: 8 }}>
          <ListRow
            rail="Rewards"
            title="Burger Block Rewards"
            sub="Eat, stamp, earn — 10 stamps = free burger"
            right={<OpenPill />}
            onPress={() => router.push('/detail/burgerblock.dappdock.eth')}
          />
          <ListRow
            rail="Food"
            title="Corner Bistro — Order & Pay"
            sub="Order in-app, pay any chain, earn points"
            right={<OpenPill />}
            onPress={() => router.push('/detail/bistro.dappdock.eth')}
          />
          <ListRow
            rail="Finance"
            title="Split USDC Payment"
            sub="Collect from any chain"
            right={<OpenPill />}
            onPress={() => router.push('/detail/split.dappdock.eth')}
          />
          <ListRow
            rail="Community"
            title="DAO Vote Starter"
            sub="One vote per verified human"
            right={<Chip label="World ID gated" bg={C.successBg} color={C.success} />}
            onPress={() => router.push('/detail/daovote.dappdock.eth')}
          />
          <ListRow
            rail="Agents"
            title="Research Agent Market"
            sub="Human-backed agent tools"
            right={<Chip label="ENS verified" bg={C.blueSoft} color={C.blueLink} />}
            onPress={() => router.push('/detail/agentmarket.dappdock.eth')}
          />
          <ListRow
            rail="Events"
            title="Ticket Claim"
            sub="Claim your event pass"
            right={<Chip label="One per human" bg={C.warnBg} color={C.warn} />}
            onPress={() => router.push('/detail/tickets.dappdock.eth')}
          />
        </View>
      </Screen>
      <TabBar active="home" />
    </View>
  );
}
