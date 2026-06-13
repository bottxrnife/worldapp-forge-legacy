/**
 * RestaurantApp — the runtime for any `menu` dapp (e.g. Corner Bistro).
 *
 * A points-only ordering mini-app (no stamps): Order / Rewards / History tabs.
 *   - Order:   build a cart, pay the total via LI.FI, earn `pointsPerDollar` points.
 *   - Rewards: redeem points for the merchant's rewards (100 pts = $1 spent).
 *   - History: past orders, each re-openable as a pickup QR.
 * After paying, a confirmation shows a **pickup QR** carrying the buyer's
 * identity (ENS / short address) + a unique order id so the restaurant can
 * verify whose food it is.
 */
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { POINTS_REWARDS } from '../data/seeds';
import { authenticateForSpend } from '../services/biometric';
import { runFlow } from '../services/execution';
import { lookupAddress } from '../services/identity';
import { OrderRecord, useApp } from '../state/store';
import { DappListing, DappManifest } from '../types';
import { C } from '../theme';
import { MenuItem, MenuOrder } from './MenuOrder';
import { QR } from './QR';
import { BackButton, Chip, PrimaryButton, Txt } from './ui';

type Tab = 'order' | 'rewards' | 'history';

const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : 'guest');
const orderLink = (id: string) => `dappdock://order/${id}`;

export function RestaurantApp({ manifest, listing }: { manifest: DappManifest; listing: DappListing }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useApp((s) => s.themeMode); // repaint on theme toggle

  const menu = manifest.components.find((c) => c.type === 'menu') as
    | { type: 'menu'; currency: string; items: MenuItem[]; pointsPerDollar?: number }
    | undefined;
  const items = menu?.items ?? [];
  const currency = menu?.currency ?? 'USDC';
  const ppd = menu?.pointsPerDollar ?? 100;

  const loyalty = useApp((s) => s.loyalty);
  const wallet = useApp((s) => s.wallet);
  const addPoints = useApp((s) => s.addPoints);
  const spendPoints = useApp((s) => s.spendPoints);
  const recordActivity = useApp((s) => s.recordActivity);
  const placeOrder = useApp((s) => s.placeOrder);
  const orders = useApp((s) => s.orders);

  const points = loyalty[manifest.ensName]?.points ?? 0;
  const rewards = POINTS_REWARDS.filter((r) => r.ens === manifest.ensName);
  const myOrders = useMemo(
    () => orders.filter((o) => o.ens === manifest.ensName),
    [orders, manifest.ensName]
  );

  const [tab, setTab] = useState<Tab>('order');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [paying, setPaying] = useState(false);
  const [confirmation, setConfirmation] = useState<OrderRecord | null>(null);

  // The buyer's identity for the pickup QR: primary ENS if they have one, else
  // their short wallet address. Resolved live — never hard-coded.
  const [handle, setHandle] = useState<string>(short(wallet?.address));
  useEffect(() => {
    setHandle(short(wallet?.address));
    if (wallet?.address) lookupAddress(wallet.address).then((n) => n && setHandle(n)).catch(() => {});
  }, [wallet?.address]);

  const addItem = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const removeItem = (id: string) =>
    setCart((c) => {
      const n = (c[id] ?? 0) - 1;
      const next = { ...c };
      if (n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = items.reduce((sum, it) => sum + it.priceUsd * (cart[it.id] ?? 0), 0);

  const placeAndPay = async () => {
    if (paying || cartCount === 0) return;
    setPaying(true);
    try {
      const ok = await authenticateForSpend(`Confirm $${cartTotal.toFixed(2)} order`);
      if (!ok) {
        Alert.alert('Cancelled', 'Order was not confirmed.');
        return;
      }
      const outcome = await runFlow(manifest, () => {}, { amountUsd: cartTotal });
      const earned = Math.round(cartTotal * ppd);
      const summary = items.filter((it) => cart[it.id]).map((it) => ({ name: it.name, qty: cart[it.id] }));
      const record = placeOrder({
        ens: manifest.ensName,
        items: summary,
        totalUsd: cartTotal,
        points: earned,
        userHandle: handle,
        live: outcome.live,
        explorerUrl: outcome.explorerUrl,
      });
      addPoints(manifest.ensName, earned);
      recordActivity({
        ens: manifest.ensName,
        title: manifest.name,
        kind: 'purchase',
        amountUsd: cartTotal,
        points: earned,
        note: summary.map((s) => `${s.qty}× ${s.name}`).join(', '),
        live: outcome.live,
        explorerUrl: outcome.explorerUrl,
      });
      setCart({});
      setConfirmation(record);
    } catch (e) {
      Alert.alert('Order failed', String(e).slice(0, 200));
    } finally {
      setPaying(false);
    }
  };

  const redeem = (r: { label: string; cost: number; emoji: string }) => {
    if (points < r.cost) {
      Alert.alert('Not enough points', `${r.label} costs ${r.cost.toLocaleString()} points. You have ${points.toLocaleString()}.`);
      return;
    }
    Alert.alert('Redeem reward', `Spend ${r.cost.toLocaleString()} points on ${r.label}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Redeem',
        onPress: () => {
          if (spendPoints(manifest.ensName, r.cost, r.label)) {
            Alert.alert('Redeemed 🎉', `${r.label} is ready — show this at the counter.`);
          }
        },
      },
    ]);
  };

  const seg = (on: boolean) => ({
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: on ? C.surface : 'transparent',
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* pinned header */}
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 20, paddingBottom: 10, backgroundColor: C.bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <BackButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/store'))} />
          <View style={{ flex: 1 }}>
            <Txt size={16} w={800} numberOfLines={1}>
              {listing.runtimeTitle}
            </Txt>
            <Txt size={12} w={600} color={C.blueLink}>
              {manifest.ensName}
            </Txt>
          </View>
          <View style={{ backgroundColor: C.inkPanel, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Txt size={12.5} w={700} color={C.white}>
              ★ {points.toLocaleString()} pts
            </Txt>
          </View>
        </View>
        {/* tabs */}
        <View style={{ flexDirection: 'row', backgroundColor: C.segBg, borderRadius: 999, padding: 4, marginTop: 12 }}>
          {(['order', 'rewards', 'history'] as Tab[]).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={seg(tab === t)}>
              <Txt size={13} w={tab === t ? 700 : 600} color={tab === t ? C.text : C.text2}>
                {t === 'order' ? 'Order' : t === 'rewards' ? 'Rewards' : 'History'}
              </Txt>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: (tab === 'order' ? 130 : 40) + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {tab === 'order' && (
          <View>
            <View style={{ backgroundColor: C.blueSoft, borderRadius: 16, paddingVertical: 11, paddingHorizontal: 15, marginBottom: 12 }}>
              <Txt size={12.5} w={600} color={C.blueBody}>
                Earn {ppd} points for every $1 you spend — redeem them on the Rewards tab.
              </Txt>
            </View>
            <MenuOrder items={items} cart={cart} onAdd={addItem} onRemove={removeItem} />
          </View>
        )}

        {tab === 'rewards' && (
          <View>
            <View style={{ backgroundColor: C.inkPanel, borderRadius: 20, padding: 18 }}>
              <Txt size={11} w={700} color="#B8C6F2" ls={0.06} style={{ textTransform: 'uppercase' }}>
                Your points
              </Txt>
              <Txt size={30} w={800} color={C.white} style={{ marginTop: 4 }}>
                {points.toLocaleString()}
              </Txt>
              <Txt size={12.5} color="#9FB0DA" style={{ marginTop: 2 }}>
                {ppd} points per $1 spent
              </Txt>
            </View>
            <Txt size={13} w={700} color={C.text2} ls={0.04} style={{ textTransform: 'uppercase', marginTop: 18, marginBottom: 4 }}>
              Redeem points
            </Txt>
            {rewards.map((r) => {
              const enough = points >= r.cost;
              return (
                <Pressable
                  key={r.label}
                  onPress={() => redeem(r)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: 18, padding: 14, marginTop: 8 }}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: C.blueSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Txt size={19}>{r.emoji}</Txt>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt size={14.5} w={700} numberOfLines={1}>
                      {r.label}
                    </Txt>
                    <Txt size={12.5} color={enough ? C.success : C.text3} style={{ marginTop: 1 }}>
                      {r.cost.toLocaleString()} points{enough ? '' : ` · need ${(r.cost - points).toLocaleString()} more`}
                    </Txt>
                  </View>
                  <Chip
                    label={enough ? 'Redeem' : 'Locked'}
                    bg={enough ? C.cta : C.segBg}
                    color={enough ? C.ctaText : C.text3}
                    size={11.5}
                    px={12}
                    py={6}
                  />
                </Pressable>
              );
            })}
            {rewards.length === 0 && (
              <Txt size={13} color={C.text3} style={{ marginTop: 10 }}>
                No rewards listed yet — keep earning points.
              </Txt>
            )}
          </View>
        )}

        {tab === 'history' && (
          <View style={{ gap: 8 }}>
            {myOrders.map((o) => (
              <Pressable
                key={o.id}
                onPress={() => setConfirmation(o)}
                style={{ backgroundColor: C.surface, borderRadius: 18, padding: 15 }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Txt size={14.5} w={700}>
                    Order #{o.id}
                  </Txt>
                  <Txt size={14.5} w={800}>
                    ${o.totalUsd.toFixed(2)}
                  </Txt>
                </View>
                <Txt size={12.5} color={C.text2} numberOfLines={1} style={{ marginTop: 3 }}>
                  {o.items.map((it) => `${it.qty}× ${it.name}`).join(', ')}
                </Txt>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7 }}>
                  <Chip label={`+${o.points.toLocaleString()} pts`} bg={C.successBg} color={C.success} size={10.5} px={9} py={4} />
                  <Chip label="View pickup QR" bg={C.blueSoft} color={C.blueLink} size={10.5} px={9} py={4} />
                  {!o.live && <Chip label="Simulated" bg={C.warnBg} color={C.warn} size={10.5} px={9} py={4} />}
                </View>
              </Pressable>
            ))}
            {myOrders.length === 0 && (
              <View style={{ alignItems: 'center', paddingTop: 60 }}>
                <Txt size={30}>🧾</Txt>
                <Txt size={15} w={700} style={{ marginTop: 10 }}>
                  No orders yet
                </Txt>
                <Txt size={13} color={C.text2} center style={{ marginTop: 4, maxWidth: 240 }}>
                  Place an order and it’ll show up here with a pickup QR.
                </Txt>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* pinned pay bar (Order tab) */}
      {tab === 'order' && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: 20,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom, 12) + 10,
            backgroundColor: C.bg,
            borderTopWidth: 1,
            borderTopColor: C.dividerSoft,
          }}
        >
          <PrimaryButton
            testID="runtime-pay"
            label={
              paying
                ? 'Placing your order…'
                : cartCount === 0
                  ? 'Add items to your order'
                  : `Place order · $${cartTotal.toFixed(2)} (+${Math.round(cartTotal * ppd)} pts)`
            }
            onPress={placeAndPay}
            style={{ opacity: cartCount === 0 ? 0.55 : 1 }}
          />
        </View>
      )}

      {/* order confirmation — the pickup QR */}
      <Modal visible={!!confirmation} transparent animationType="fade" onRequestClose={() => setConfirmation(null)}>
        <Pressable
          onPress={() => setConfirmation(null)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <Pressable onPress={() => {}} style={{ backgroundColor: C.surface, borderRadius: 26, padding: 22, width: '100%', maxWidth: 360, alignItems: 'center' }}>
            <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: C.successBg, alignItems: 'center', justifyContent: 'center' }}>
              <Txt size={24} w={700} color={C.success}>
                ✓
              </Txt>
            </View>
            <Txt size={19} w={800} style={{ marginTop: 12 }}>
              Order confirmed
            </Txt>
            <Txt size={13} color={C.text2} center style={{ marginTop: 4 }}>
              Show this QR at the counter to pick up your food.
            </Txt>

            <View style={{ backgroundColor: C.white, borderRadius: 18, padding: 14, marginTop: 16 }}>
              <QR value={confirmation ? orderLink(confirmation.id) : 'x'} size={168} />
            </View>

            <View style={{ alignItems: 'center', marginTop: 14 }}>
              <Txt size={11} w={700} color={C.text3} ls={0.05} style={{ textTransform: 'uppercase' }}>
                Pickup for
              </Txt>
              <Txt size={15.5} w={800} style={{ marginTop: 3 }} numberOfLines={1}>
                {confirmation?.userHandle}
              </Txt>
              <Txt size={12.5} w={600} color={C.blueLink} style={{ marginTop: 1 }}>
                Order #{confirmation?.id} · +{confirmation?.points.toLocaleString()} pts
              </Txt>
            </View>

            <View style={{ alignSelf: 'stretch', backgroundColor: C.bg, borderRadius: 14, padding: 12, marginTop: 14 }}>
              {confirmation?.items.map((it) => (
                <View key={it.name} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                  <Txt size={13} color={C.text2}>
                    {it.qty}× {it.name}
                  </Txt>
                </View>
              ))}
              <View style={{ height: 1, backgroundColor: C.divider, marginVertical: 8 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Txt size={13.5} w={700}>
                  Total
                </Txt>
                <Txt size={13.5} w={800}>
                  ${confirmation?.totalUsd.toFixed(2)} {currency}
                </Txt>
              </View>
            </View>

            <Pressable
              onPress={() => {
                setConfirmation(null);
                setTab('history');
              }}
              style={{ backgroundColor: C.cta, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40, marginTop: 18, alignSelf: 'stretch', alignItems: 'center' }}
            >
              <Txt size={14.5} w={700} color={C.ctaText}>
                Done
              </Txt>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
