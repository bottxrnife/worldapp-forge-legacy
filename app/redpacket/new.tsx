import { useRouter } from 'expo-router';
import { Dices, Gift, Sparkles, Users } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import { BackButton, PrimaryButton, Screen, SectionHeader, Txt } from '../../src/components/ui';
import { authenticateForSpend } from '../../src/services/biometric';
import { useApp } from '../../src/state/store';
import { C } from '../../src/theme';

const MAX_PACKETS = 100;

export default function NewRedPacket() {
  const router = useRouter();
  const wallet = useApp((s) => s.wallet);
  const createRedPacket = useApp((s) => s.createRedPacket);
  const recordActivity = useApp((s) => s.recordActivity);
  useApp((s) => s.themeMode); // repaint on theme toggle

  const [amount, setAmount] = useState('');
  const [count, setCount] = useState('5');
  const [split, setSplit] = useState<'equal' | 'lucky'>('lucky');
  const [busy, setBusy] = useState(false);

  const total = parseFloat(amount) || 0;
  const n = parseInt(count, 10) || 0;
  const valid = total > 0 && n >= 1 && n <= MAX_PACKETS;
  const underfunded = !wallet || wallet.totalUsdc < total;

  const inputStyle = {
    backgroundColor: C.bg,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Geist_700Bold',
    color: C.text,
  } as const;

  const create = async () => {
    if (busy) return;
    if (!(total > 0)) {
      Alert.alert('Add an amount', 'Enter how much USDC to put in the packet.');
      return;
    }
    if (!(n >= 1)) {
      Alert.alert('Add packets', 'Split into at least one packet.');
      return;
    }
    if (n > MAX_PACKETS) {
      Alert.alert('Too many packets', `Keep it to ${MAX_PACKETS} packets or fewer.`);
      return;
    }
    setBusy(true);
    try {
      const ok = await authenticateForSpend(`Fund $${total.toFixed(2)} red packet`);
      if (!ok) {
        Alert.alert('Cancelled', 'Authentication was not completed.');
        return;
      }
      const id = createRedPacket({ from: 'william.eth', totalUsd: total, count: n, split });
      recordActivity({
        ens: 'redpacket',
        title: `Sent a ${n}-packet red packet`,
        kind: 'send',
        amountUsd: total,
      });
      router.replace(`/redpacket/${id}`);
    } catch (e) {
      Alert.alert('Could not create', String(e).slice(0, 220));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <BackButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
        <View style={{ flex: 1 }}>
          <Txt size={16} w={800}>
            Lucky Money
          </Txt>
          <Txt size={12} w={600} color={C.text2}>
            Send a red packet — one claim per human
          </Txt>
        </View>
      </View>

      {/* festive hero (inkPanel) */}
      <View style={{ backgroundColor: C.inkPanel, borderRadius: 26, padding: 22, marginTop: 16, alignItems: 'center' }}>
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: 'rgba(255,255,255,0.12)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Gift size={28} color={C.white} strokeWidth={2.4} />
        </View>
        <Txt size={28} w={800} color={C.white} style={{ marginTop: 14 }}>
          ${total.toFixed(2)}
        </Txt>
        <Txt size={13} color="#B8C6F2" style={{ marginTop: 3 }}>
          🧧 {n} {n === 1 ? 'packet' : 'packets'} · {split === 'lucky' ? 'random amounts' : 'split evenly'}
        </Txt>
      </View>

      {/* amount */}
      <SectionHeader title="Amount" size={17} />
      <View style={{ backgroundColor: C.surface, borderRadius: 22, padding: 18, gap: 14 }}>
        <View style={{ gap: 8 }}>
          <Txt size={12} w={700} color={C.text2} ls={0.04} style={{ textTransform: 'uppercase' }}>
            Total amount (USDC)
          </Txt>
          <TextInput
            testID="redpacket-amount"
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={C.text3}
            keyboardType="decimal-pad"
            style={inputStyle}
          />
        </View>
        <View style={{ gap: 8 }}>
          <Txt size={12} w={700} color={C.text2} ls={0.04} style={{ textTransform: 'uppercase' }}>
            Number of packets
          </Txt>
          <TextInput
            testID="redpacket-count"
            value={count}
            onChangeText={setCount}
            placeholder="5"
            placeholderTextColor={C.text3}
            keyboardType="number-pad"
            style={inputStyle}
          />
        </View>
        {valid ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <Users size={14} color={C.text2} strokeWidth={2.2} />
            <Txt size={12.5} color={C.text2}>
              {n} {n === 1 ? 'person' : 'people'} ·{' '}
              {split === 'equal'
                ? `$${(total / n).toFixed(2)} each`
                : `~$${(total / n).toFixed(2)} avg, luck of the draw`}
            </Txt>
          </View>
        ) : null}
      </View>

      {/* split toggle */}
      <SectionHeader title="Split" size={17} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <SplitOption
          testID="redpacket-split-equal"
          active={split === 'equal'}
          icon={<Users size={18} color={split === 'equal' ? C.ctaText : C.text2} strokeWidth={2.2} />}
          title="Split evenly"
          sub="Same amount for everyone"
          onPress={() => setSplit('equal')}
        />
        <SplitOption
          testID="redpacket-split-lucky"
          active={split === 'lucky'}
          icon={<Dices size={18} color={split === 'lucky' ? C.ctaText : C.text2} strokeWidth={2.2} />}
          title="Lucky (random)"
          sub="Random share each open"
          onPress={() => setSplit('lucky')}
        />
      </View>

      {/* explainer */}
      <View style={{ backgroundColor: C.surface, borderRadius: 16, padding: 16, marginTop: 16, flexDirection: 'row', gap: 10 }}>
        <Sparkles size={16} color={C.blueLink} strokeWidth={2.2} style={{ marginTop: 1 }} />
        <Txt size={12.5} color={C.text2} lh={1.5} style={{ flex: 1 }}>
          World ID makes sure each person opens exactly one packet. Recipients receive on any chain
          via LI.FI.
        </Txt>
      </View>

      {/* unfunded hint — never blocks creation */}
      {underfunded ? (
        <View style={{ backgroundColor: C.warnBg, borderRadius: 16, padding: 14, marginTop: 12, flexDirection: 'row', gap: 10 }}>
          <Sparkles size={16} color={C.warn} strokeWidth={2.2} style={{ marginTop: 1 }} />
          <Txt size={12.5} color={C.warn} lh={1.45} style={{ flex: 1 }}>
            Your wallet isn&apos;t funded for this yet, so this packet is created in simulation. Fund
            your wallet to send for real — you can still create and share it now.
          </Txt>
        </View>
      ) : null}

      <PrimaryButton
        testID="redpacket-create"
        label={busy ? 'Wrapping…' : 'Create packet'}
        onPress={create}
        leading={<Gift size={17} color={C.ctaText} strokeWidth={2.4} />}
        style={{ marginTop: 16 }}
      />
      <Txt size={11.5} color={C.text3} center style={{ marginTop: 10 }}>
        One claim per verified human, powered by World ID.
      </Txt>
    </Screen>
  );
}

function SplitOption({
  active,
  icon,
  title,
  sub,
  onPress,
  testID,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  sub: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={{
        flex: 1,
        backgroundColor: active ? C.cta : C.surface,
        borderRadius: 18,
        padding: 15,
        gap: 8,
      }}
    >
      {icon}
      <Txt size={14} w={700} color={active ? C.ctaText : C.text}>
        {title}
      </Txt>
      <Txt size={11.5} color={active ? C.ctaText : C.text3} lh={1.35}>
        {sub}
      </Txt>
    </Pressable>
  );
}
