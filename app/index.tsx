import { useRouter } from 'expo-router';
import { Circle, Plus, ArrowUp } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { PrimaryButton, Screen, Txt } from '../src/components/ui';
import { verifyHuman } from '../src/services/verification';
import { useApp } from '../src/state/store';
import { C } from '../src/theme';

function ValueCard({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: C.surface,
        borderRadius: 20,
        paddingVertical: 16,
        paddingHorizontal: 12,
        gap: 10,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: C.blueSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <Txt size={13} w={700} lh={1.3}>
        {label}
      </Txt>
    </View>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const setVerified = useApp((s) => s.setVerified);
  useApp((s) => s.themeMode); // repaint on theme toggle
  const [status, setStatus] = useState<string | null>(null);

  const start = async () => {
    if (status) return;
    setStatus('Starting…');
    try {
      const result = await verifyHuman({ signal: 'dappdock-session', onStatus: setStatus });
      if (result.verified) {
        setVerified({ verified: true, simulated: result.simulated });
        router.replace('/home');
      } else {
        setStatus(null);
        Alert.alert('World ID', result.error ?? 'Verification failed. Try again.');
      }
    } catch (e) {
      setStatus(null);
      Alert.alert('World ID', String(e));
    }
  };

  return (
    <Screen scroll={false} style={{ paddingTop: 74, paddingHorizontal: 24 }}>
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 17,
          backgroundColor: C.cta,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 40,
        }}
      >
        <Txt size={25} w={800} color={C.ctaText}>
          D
        </Txt>
      </View>
      <Txt size={34} w={800} ls={-0.02} lh={1.12} style={{ marginTop: 28 }}>
        One app for{'\n'}every dapp.
      </Txt>
      <Txt size={15.5} color={C.text2} lh={1.55} style={{ marginTop: 14, maxWidth: 300 }}>
        Use, create, and publish onchain apps with an AI design assistant. No wallets, chains, or
        contracts to think about.
      </Txt>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 34 }}>
        <ValueCard icon={<Circle size={15} color={C.blueLink} strokeWidth={2.6} />} label="Use dapps" />
        <ValueCard icon={<Plus size={17} color={C.blueLink} strokeWidth={2.6} />} label="Create dapps" />
        <ValueCard
          icon={<ArrowUp size={16} color={C.blueLink} strokeWidth={2.6} />}
          label={'Publish to the store'}
        />
      </View>

      <View style={{ flex: 1 }} />

      <PrimaryButton
        label={status ?? 'Start with World ID'}
        onPress={start}
        leading={
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              borderWidth: 2,
              borderColor: C.ctaText,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Txt size={10} color={C.ctaText}>
              ✓
            </Txt>
          </View>
        }
      />
      <Pressable onPress={() => router.replace('/store')} style={{ paddingTop: 16, paddingBottom: 4 }}>
        <Txt size={14.5} w={600} color={C.text2} center>
          Explore first
        </Txt>
      </Pressable>
    </Screen>
  );
}
