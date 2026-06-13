import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip, DappAvatar, FadeUp, ListRow, OpenPill, SearchPill, SectionHeader, Txt } from '../src/components/ui';
import { dappEmoji } from '../src/dappStyle';
import { getWalletSnapshot } from '../src/services/wallet';
import { HomeShortcut, syncLoyaltyFromChain, useApp } from '../src/state/store';
import { C } from '../src/theme';

/** Non-dapp actions the user can add to their Home grid (alongside any dapp). */
const ACTION_CATALOG: HomeShortcut[] = [
  { id: 'scan', emoji: '📷', label: 'Scan', route: '/scan' },
  { id: 'wallet', emoji: '👛', label: 'Wallet', route: '/wallet' },
  { id: 'activity', emoji: '🧾', label: 'Activity', route: '/activity' },
  { id: 'pay', emoji: '💸', label: 'Pay', route: '/pay' },
  { id: 'lucky', emoji: '🧧', label: 'Lucky', route: '/redpacket/new' },
  { id: 'rewards', emoji: '🎁', label: 'Rewards', route: '/rewards' },
  { id: 'create', emoji: '✨', label: 'Create', route: '/assistant' },
  { id: 'store', emoji: '🛍️', label: 'Store', route: '/store' },
];

function ShortcutTile({
  emoji,
  label,
  onPress,
  onRemove,
  onMoveLeft,
  onMoveRight,
}: {
  emoji: string;
  label: string;
  onPress: () => void;
  onRemove?: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
}) {
  const editing = !!onRemove;
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexBasis: '22%',
        flexGrow: 1,
        backgroundColor: C.surface,
        borderRadius: 20,
        paddingTop: 14,
        paddingBottom: editing ? 8 : 12,
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
        <Txt size={19}>{emoji}</Txt>
      </View>
      <Txt size={12} w={600} numberOfLines={1}>
        {label}
      </Txt>
      {/* hold-free reorder: move this tile left / right within the grid */}
      {editing && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 1 }}>
          <Pressable onPress={onMoveLeft} hitSlop={6} disabled={!onMoveLeft}>
            <ChevronLeft size={16} color={onMoveLeft ? C.blueLink : C.divider} strokeWidth={2.6} />
          </Pressable>
          <Pressable onPress={onMoveRight} hitSlop={6} disabled={!onMoveRight}>
            <ChevronRight size={16} color={onMoveRight ? C.blueLink : C.divider} strokeWidth={2.6} />
          </Pressable>
        </View>
      )}
      {onRemove && (
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          style={{
            position: 'absolute',
            top: -5,
            right: -5,
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: C.danger,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={13} color={C.white} strokeWidth={3} />
        </Pressable>
      )}
    </Pressable>
  );
}

function AddTile({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexBasis: '22%',
        flexGrow: 1,
        borderRadius: 20,
        paddingTop: 14,
        paddingBottom: 12,
        paddingHorizontal: 6,
        alignItems: 'center',
        gap: 8,
        borderWidth: 1.5,
        borderColor: C.divider,
        borderStyle: 'dashed',
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: C.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Plus size={18} color={C.text2} strokeWidth={2.4} />
      </View>
      <Txt size={12} w={600} color={C.text2}>
        Add
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
  const insets = useSafeAreaInsets();
  const verified = useApp((s) => s.verified);
  const wallet = useApp((s) => s.wallet);
  const setWallet = useApp((s) => s.setWallet);
  const listings = useApp((s) => s.listings);
  const homeShortcuts = useApp((s) => s.homeShortcuts);
  const addShortcut = useApp((s) => s.addShortcut);
  const removeShortcut = useApp((s) => s.removeShortcut);
  const moveShortcut = useApp((s) => s.moveShortcut);
  const resetShortcuts = useApp((s) => s.resetShortcuts);
  const activity = useApp((s) => s.activity);
  useApp((s) => s.themeMode); // repaint on theme toggle
  const [editing, setEditing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addQuery, setAddQuery] = useState('');

  // Everything the user could add: the action catalog + every store dapp,
  // minus whatever's already on the grid.
  const dappShortcuts: HomeShortcut[] = listings.map((l) => ({
    id: `dapp:${l.manifest.ensName}`,
    emoji: dappEmoji(l.manifest.ensName, l.manifest.category),
    label: l.manifest.name,
    route: `/detail/${l.manifest.ensName}`,
  }));
  const addable = [...ACTION_CATALOG, ...dappShortcuts].filter(
    (s) => !homeShortcuts.some((x) => x.id === s.id)
  );
  // Search within the Add sheet (issue #3): filter by label.
  const q = addQuery.trim().toLowerCase();
  const filteredAddable = q
    ? addable.filter((s) => s.label.toLowerCase().includes(q))
    : addable;
  // "Recent" dapps to add: most-recently-used dapps from the activity feed that
  // aren't already on the grid (deduped, newest first).
  const recentAddable = useMemo(() => {
    const seen = new Set<string>();
    const out: HomeShortcut[] = [];
    for (const a of activity) {
      const id = `dapp:${a.ens}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const match = addable.find((s) => s.id === id);
      if (match) out.push(match);
      if (out.length >= 6) break;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity, homeShortcuts, listings]);

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

  // Bottom-sheet motion (issue #1): the backdrop fades (Modal animationType
  // "fade") while the sheet itself slides up independently — previously the whole
  // Modal slid, so the dark layer "followed" the sheet.
  const sheet = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (showAdd) {
      sheet.setValue(0);
      Animated.timing(sheet, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      setAddQuery('');
    }
  }, [showAdd, sheet]);
  const sheetY = sheet.interpolate({ inputRange: [0, 1], outputRange: [480, 0] });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* PINNED header — greeting, balance, identity, search stay put (issue #4) */}
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 20, backgroundColor: C.bg }}>
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

        <View style={{ marginTop: 16, marginBottom: 14 }}>
          <SearchPill testID="home-search" placeholder="Search dapps or ask for one…" onPress={() => router.push('/search')} />
        </View>
      </View>

      {/* scrollable body */}
      <FadeUp style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 + Math.max(insets.bottom, 12) }}
          showsVerticalScrollIndicator={false}
        >
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

        {/* quick actions — a customizable grid the user owns */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 18,
          }}
        >
          <Txt size={17} w={800}>
            Shortcuts
          </Txt>
          <Pressable
            onPress={() => setEditing((e) => !e)}
            hitSlop={8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
          >
            <Pencil size={13} color={C.blueLink} strokeWidth={2.4} />
            <Txt size={13} w={700} color={C.blueLink}>
              {editing ? 'Done' : 'Customize'}
            </Txt>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
          {homeShortcuts.map((s, i) => (
            <ShortcutTile
              key={s.id}
              emoji={s.emoji}
              label={s.label}
              onPress={() => {
                if (!editing) router.push(s.route as any);
              }}
              onRemove={editing ? () => removeShortcut(s.id) : undefined}
              onMoveLeft={editing && i > 0 ? () => moveShortcut(s.id, -1) : undefined}
              onMoveRight={editing && i < homeShortcuts.length - 1 ? () => moveShortcut(s.id, 1) : undefined}
            />
          ))}
          {editing && <AddTile onPress={() => setShowAdd(true)} />}
          {/* keep the last row left-aligned when the count isn't a multiple of 4 */}
          {homeShortcuts.length % 4 !== 0 && !editing && <View style={{ flexBasis: '22%', flexGrow: 1 }} />}
        </View>

        <SectionHeader title="Recommended dapps" link="See all" onLink={() => router.replace('/store')} />
        <View style={{ gap: 8 }}>
          <ListRow
            icon={<DappAvatar ens="burgerblock.dappdock.eth" />}
            title="Burger Block Rewards"
            sub="Eat, stamp, earn — 10 stamps = free burger"
            right={<OpenPill />}
            onPress={() => router.push('/detail/burgerblock.dappdock.eth')}
          />
          <ListRow
            icon={<DappAvatar ens="bistro.dappdock.eth" />}
            title="Corner Bistro — Order & Pay"
            sub="Order in-app, pay any chain, earn points"
            right={<OpenPill />}
            onPress={() => router.push('/detail/bistro.dappdock.eth')}
          />
          <ListRow
            icon={<DappAvatar ens="split.dappdock.eth" />}
            title="Split USDC Payment"
            sub="Collect from any chain"
            right={<OpenPill />}
            onPress={() => router.push('/detail/split.dappdock.eth')}
          />
          <ListRow
            icon={<DappAvatar ens="daovote.dappdock.eth" />}
            title="DAO Vote Starter"
            sub="One vote per verified human"
            right={<Chip label="World ID gated" bg={C.successBg} color={C.success} />}
            onPress={() => router.push('/detail/daovote.dappdock.eth')}
          />
          <ListRow
            icon={<DappAvatar ens="agentmarket.dappdock.eth" />}
            title="Research Agent Market"
            sub="Human-backed agent tools"
            right={<Chip label="ENS verified" bg={C.blueSoft} color={C.blueLink} />}
            onPress={() => router.push('/detail/agentmarket.dappdock.eth')}
          />
          <ListRow
            icon={<DappAvatar ens="tickets.dappdock.eth" />}
            title="Ticket Claim"
            sub="Claim your event pass"
            right={<Chip label="One per human" bg={C.warnBg} color={C.warn} />}
            onPress={() => router.push('/detail/tickets.dappdock.eth')}
          />
        </View>
        </ScrollView>
      </FadeUp>

      {/* Add-to-home sheet: backdrop fades, sheet slides up on its own (issue #1);
          searchable with a recent-dapps row (issue #3). */}
      <Modal visible={showAdd} transparent animationType="fade" onRequestClose={() => setShowAdd(false)}>
        <Pressable
          onPress={() => setShowAdd(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
        >
          <Animated.View style={{ transform: [{ translateY: sheetY }] }}>
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: C.bg,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingTop: 18,
              paddingHorizontal: 20,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
              maxHeight: '82%',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Txt size={18} w={800}>
                Add to home
              </Txt>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <Pressable onPress={resetShortcuts} hitSlop={8}>
                  <Txt size={12.5} w={700} color={C.text3}>
                    Reset
                  </Txt>
                </Pressable>
                <Pressable onPress={() => setShowAdd(false)} hitSlop={8}>
                  <Txt size={12.5} w={700} color={C.blueLink}>
                    Done
                  </Txt>
                </Pressable>
              </View>
            </View>

            {/* search dapps & actions */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: C.surface,
                borderRadius: 999,
                paddingHorizontal: 16,
                paddingVertical: 11,
                marginBottom: 6,
              }}
            >
              <Search size={17} color={C.text3} strokeWidth={2.4} />
              <TextInput
                value={addQuery}
                onChangeText={setAddQuery}
                placeholder="Search dapps & actions…"
                placeholderTextColor={C.text3}
                style={{ flex: 1, fontSize: 14.5, fontFamily: 'Geist_400Regular', color: C.text, padding: 0 }}
              />
              {addQuery.length > 0 && (
                <Pressable onPress={() => setAddQuery('')} hitSlop={8}>
                  <X size={15} color={C.text3} strokeWidth={2.6} />
                </Pressable>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* recent dapps — quick add chips (only when not actively searching) */}
              {!q && recentAddable.length > 0 && (
                <View style={{ marginTop: 8, marginBottom: 6 }}>
                  <Txt size={11} w={700} color={C.text3} ls={0.05} style={{ textTransform: 'uppercase', marginBottom: 8 }}>
                    Recent
                  </Txt>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {recentAddable.map((s) => (
                      <Pressable
                        key={s.id}
                        onPress={() => addShortcut(s)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 7,
                          backgroundColor: C.surface,
                          borderRadius: 999,
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                        }}
                      >
                        <Txt size={15}>{s.emoji}</Txt>
                        <Txt size={13} w={600} numberOfLines={1} style={{ maxWidth: 120 }}>
                          {s.label}
                        </Txt>
                        <Plus size={15} color={C.blueLink} strokeWidth={2.6} />
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {!q && (
                <Txt size={11} w={700} color={C.text3} ls={0.05} style={{ textTransform: 'uppercase', marginTop: 10, marginBottom: 4 }}>
                  All
                </Txt>
              )}
              {filteredAddable.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => addShortcut(s)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 11,
                    borderBottomWidth: 1,
                    borderBottomColor: C.dividerSoft,
                  }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.blueSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Txt size={17}>{s.emoji}</Txt>
                  </View>
                  <Txt size={14.5} w={600} numberOfLines={1} style={{ flex: 1 }}>
                    {s.label}
                  </Txt>
                  <Plus size={18} color={C.blueLink} strokeWidth={2.6} />
                </Pressable>
              ))}
              {filteredAddable.length === 0 && (
                <Txt size={13} color={C.text3} center style={{ paddingVertical: 24 }}>
                  {addable.length === 0 ? 'Everything’s already on your home screen.' : `No matches for “${addQuery}”.`}
                </Txt>
              )}
            </ScrollView>
          </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}
