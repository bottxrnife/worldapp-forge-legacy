import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowUpRight, Check } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import { BackButton, Chip, IconTile, Overline, PrimaryButton, Screen, SectionHeader, Txt } from '../src/components/ui';
import { authenticateForSpend } from '../src/services/biometric';
import { resolveAddress } from '../src/services/identity';
import { sendUsdc } from '../src/services/wallet';
import { useApp } from '../src/state/store';
import { C } from '../src/theme';

const short = (a: string) => (a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);
const isAddress = (s: string) => /^0x[a-fA-F0-9]{40}$/.test(s.trim());

export default function Pay() {
  const router = useRouter();
  const params = useLocalSearchParams<{ ens?: string; amount?: string }>();
  const wallet = useApp((s) => s.wallet);
  const contacts = useApp((s) => s.contacts);
  const saveContact = useApp((s) => s.saveContact);
  const recordActivity = useApp((s) => s.recordActivity);
  useApp((s) => s.themeMode); // repaint on theme toggle

  const [to, setTo] = useState(params.ens ?? '');
  const [amount, setAmount] = useState(params.amount ?? '');
  const [resolved, setResolved] = useState<{ name: string; address: string } | null>(null);
  const [missed, setMissed] = useState(false); // tried to resolve a .eth name and got nothing
  const [busy, setBusy] = useState(false);

  // resolve a recipient string → 0x address (never throws)
  const resolve = async (name: string): Promise<string | null> => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    if (isAddress(trimmed)) {
      setResolved({ name: trimmed, address: trimmed });
      setMissed(false);
      return trimmed;
    }
    let addr: string | null = null;
    try {
      addr = await resolveAddress(trimmed);
    } catch {
      addr = null;
    }
    if (addr) {
      setResolved({ name: trimmed, address: addr });
      setMissed(false);
    } else {
      setResolved(null);
      setMissed(true);
    }
    return addr;
  };

  // light 500ms debounce: resolve names ending in .eth as the user pauses
  useEffect(() => {
    const trimmed = to.trim();
    if (!trimmed || !trimmed.toLowerCase().endsWith('.eth')) return;
    const t = setTimeout(() => {
      resolve(trimmed);
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to]);

  const doSend = async () => {
    const entered = to.trim();
    const amt = parseFloat(amount);
    if (busy || !entered || !amt || amt <= 0) {
      Alert.alert('Add a recipient and amount', 'Enter who to pay and how much.');
      return;
    }
    setBusy(true);
    try {
      // resolve now if we don't already have an address and it's an ENS name
      let address = resolved?.address ?? null;
      if (!address) address = await resolve(entered);
      if (!address && !isAddress(entered)) {
        Alert.alert("Couldn't resolve that name", `No address found for ${entered}.`);
        return;
      }
      const recipientAddress = address ?? entered;

      const ok = await authenticateForSpend(`Send $${amt.toFixed(2)} USDC`);
      if (!ok) {
        Alert.alert('Cancelled', 'Authentication was not completed.');
        return;
      }

      if (!wallet || wallet.totalUsdc < amt) {
        Alert.alert(
          'Wallet unfunded',
          'Add USDC + gas on the Wallet tab to send for real.'
        );
        return;
      }

      // send to the resolved address the user confirmed (not the raw input)
      const res = await sendUsdc({ to: recipientAddress, amountUsd: amt });
      saveContact({ ens: entered, address: recipientAddress, ts: Date.now() });
      recordActivity({
        ens: entered,
        title: `Sent to ${entered}`,
        kind: 'send',
        amountUsd: amt,
        live: true,
        explorerUrl: res.explorerUrl,
      });
      Alert.alert('Sent', `$${amt.toFixed(2)} on ${res.chainLabel}.`);
      setTo('');
      setAmount('');
      setResolved(null);
      setMissed(false);
    } catch (e) {
      Alert.alert('Send failed', String(e).slice(0, 220));
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = {
    backgroundColor: C.bg,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: 'Geist_600SemiBold',
    color: C.text,
  } as const;

  const amt = parseFloat(amount);
  const sendLabel = busy
    ? 'Confirming…'
    : amt > 0
      ? `Send $${amt.toFixed(2)}`
      : 'Send USDC';

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <BackButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
        <View style={{ flex: 1 }}>
          <Txt size={16} w={800}>
            Pay
          </Txt>
          <Txt size={12} w={600} color={C.text2}>
            Send to any ENS name — no chains, no addresses
          </Txt>
        </View>
      </View>

      {/* dark summary panel */}
      <View style={{ backgroundColor: C.inkPanel, borderRadius: 24, padding: 20, marginTop: 16 }}>
        <Overline color={C.onInkLabel} ls={0.06}>
          Pay by ENS
        </Overline>
        <Txt size={22} w={800} color={C.white} style={{ marginTop: 4 }} lh={1.3} numberOfLines={2}>
          {to.trim() ? `Paying ${to.trim()}` : 'Who are you paying?'}
        </Txt>
        <Txt size={12.5} color={C.onInkLabel} lh={1.45} style={{ marginTop: 6 }}>
          Pay anyone by their ENS name — no addresses, no chains. Routed in USDC.
        </Txt>
      </View>

      {/* pay form */}
      <View style={{ backgroundColor: C.surface, borderRadius: 22, padding: 18, marginTop: 14, gap: 10 }}>
        <TextInput
          testID="pay-recipient"
          value={to}
          onChangeText={(t) => {
            setTo(t);
            setResolved(null);
            setMissed(false);
          }}
          onEndEditing={() => to.trim() && resolve(to)}
          placeholder="To: name.eth or 0x address"
          placeholderTextColor={C.text3}
          autoCapitalize="none"
          autoCorrect={false}
          style={inputStyle}
        />
        {resolved ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 }}>
            <Check size={14} color={C.success} strokeWidth={2.6} />
            <Txt size={12.5} w={600} color={C.success}>
              Resolves to {short(resolved.address)}
            </Txt>
          </View>
        ) : missed ? (
          <View style={{ paddingHorizontal: 4 }}>
            <Txt size={12.5} w={600} color={C.text3}>
              Couldn't resolve that name yet — check the spelling.
            </Txt>
          </View>
        ) : null}
        <TextInput
          testID="pay-amount"
          value={amount}
          onChangeText={setAmount}
          placeholder="Amount in USDC"
          placeholderTextColor={C.text3}
          keyboardType="decimal-pad"
          style={inputStyle}
        />
        <PrimaryButton
          testID="pay-send"
          label={sendLabel}
          onPress={doSend}
          leading={<ArrowUpRight size={17} color={C.ctaText} strokeWidth={2.4} />}
        />
        <Txt size={11.5} color={C.text3} center>
          Routed in USDC. Biometric-protected where available.
        </Txt>
      </View>

      {/* recents */}
      {contacts.length > 0 ? (
        <>
          <SectionHeader title="Recent" size={17} />
          <View style={{ gap: 8 }}>
            {contacts.map((c) => (
              <Pressable
                key={c.ens}
                onPress={() => {
                  setTo(c.ens);
                  setResolved({ name: c.ens, address: c.address });
                  setMissed(false);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 13,
                  backgroundColor: C.surface,
                  borderRadius: 18,
                  padding: 14,
                }}
              >
                <IconTile label={c.ens.slice(0, 2).toUpperCase()} size={38} radius={12} fontSize={13} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt size={14.5} w={700} numberOfLines={1}>
                    {c.ens}
                  </Txt>
                  <Txt size={12} color={C.text3}>
                    {short(c.address)}
                  </Txt>
                </View>
                <Chip label="Pay" bg={C.blueSoft} color={C.blueLink} size={11.5} px={12} py={6} />
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}
