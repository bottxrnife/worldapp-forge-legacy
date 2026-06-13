import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Linking, Pressable, View } from 'react-native';
import { BackButton, Chip, PrimaryButton, Pulse, Screen, Txt } from '../../src/components/ui';
import { ExecutionResult, runFlow } from '../../src/services/execution';
import { verifyHuman } from '../../src/services/verification';
import { findListing, useApp } from '../../src/state/store';
import { DappManifest } from '../../src/types';
import { C } from '../../src/theme';

type RunState = 'form' | 'processing' | 'done';

function FormRow({
  label,
  value,
  valueColor = C.text,
  bold = 700,
  last,
}: {
  label: string;
  value: string;
  valueColor?: string;
  bold?: 600 | 700 | 800;
  last?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.dividerSoft,
      }}
    >
      <Txt size={13.5} color={C.text2}>
        {label}
      </Txt>
      <Txt size={bold === 800 ? 15 : 14.5} w={bold} color={valueColor}>
        {value}
      </Txt>
    </View>
  );
}

export default function Runtime() {
  const router = useRouter();
  const { ens } = useLocalSearchParams<{ ens: string }>();
  const draft = useApp((s) => s.draft);
  const verified = useApp((s) => s.verified);
  const setVerified = useApp((s) => s.setVerified);
  useApp((s) => s.themeMode); // repaint on theme toggle

  const listing = findListing(ens === 'draft' ? undefined : ens);
  const manifest: DappManifest = ens === 'draft' && draft ? draft : listing.manifest;

  // Entering Runtime always resets to the form state (spec rule).
  const [runState, setRunState] = useState<RunState>('form');
  const [runStep, setRunStep] = useState(0);
  const [paying, setPaying] = useState(false);
  const [mode, setMode] = useState<'purchase' | 'redeem'>('purchase');
  const [result, setResult] = useState<ExecutionResult | null>(null);

  const loyalty = useApp((s) => s.loyalty);
  const addStamp = useApp((s) => s.addStamp);
  const redeemReward = useApp((s) => s.redeemReward);

  const amount = manifest.components.find((c) => c.type === 'amountInput') as
    | { type: 'amountInput'; token: string; default: string }
    | undefined;
  const source = manifest.components.find((c) => c.type === 'sourceChain') as
    | { type: 'sourceChain'; value: string }
    | undefined;
  const recipient = manifest.components.find((c) => c.type === 'recipient') as
    | { type: 'recipient'; value: string }
    | undefined;
  const memo = manifest.components.find((c) => c.type === 'memoInput') as
    | { type: 'memoInput'; default: string }
    | undefined;
  const submit = manifest.components.find((c) => c.type === 'submitButton') as
    | { type: 'submitButton'; label: string }
    | undefined;
  const punch = manifest.components.find((c) => c.type === 'punchCard') as
    | { type: 'punchCard'; total: number; reward: string; pointsPerDollar: number }
    | undefined;

  const record = loyalty[manifest.ensName] ?? { punches: 0, points: 0, redeemed: 0 };
  const cardFull = !!punch && record.punches >= punch.total;

  // Loyalty redemption is local to the pass: verify stamps, issue the voucher, reset.
  const redeemSteps = punch
    ? [
        { id: 'verify', label: 'Verify your stamps', detail: `${punch.total} of ${punch.total} confirmed on your pass` },
        { id: 'voucher', label: 'Issue your reward voucher', detail: `Free ${punch.reward}` },
        { id: 'reset', label: 'Reset your punch card', detail: 'Your points balance stays untouched' },
        { id: 'save', label: 'Save your receipt', detail: 'Stored in your activity' },
      ]
    : [];

  const pay = async () => {
    if (paying) return;
    setPaying(true);
    setMode('purchase');
    try {
      if (manifest.permissions.requiresWorldId && !verified) {
        const verification = await verifyHuman({ signal: manifest.ensName });
        if (!verification.verified) {
          Alert.alert('World ID required', verification.error ?? 'This dapp requires proof of humanity.');
          return;
        }
        setVerified({ verified: true, simulated: verification.simulated });
      }
      setRunState('processing');
      setRunStep(0);
      const outcome = await runFlow(manifest, setRunStep);
      if (punch) {
        addStamp(
          manifest.ensName,
          Math.round(parseFloat(amount?.default ?? '0') * punch.pointsPerDollar)
        );
      }
      setResult(outcome);
      setRunState('done');
    } catch (e) {
      setRunState('form');
      Alert.alert('Flow failed', String(e).slice(0, 300));
    } finally {
      setPaying(false);
    }
  };

  const redeem = async () => {
    if (paying || !punch) return;
    setMode('redeem');
    setResult(null);
    setRunState('processing');
    setRunStep(0);
    for (let i = 1; i <= redeemSteps.length; i++) {
      await new Promise((r) => setTimeout(r, 600));
      setRunStep(i);
    }
    redeemReward(manifest.ensName, punch.total);
    await new Promise((r) => setTimeout(r, 500));
    setRunState('done');
  };

  const doneCopy =
    mode === 'redeem' && punch
      ? `Free ${punch.reward} redeemed — show this screen at the counter. Your card is back to ${Math.min(record.punches, punch.total)} of ${punch.total} stamps.`
      : punch
        ? `You paid $${amount?.default ?? ''} and collected a stamp — ${Math.min(record.punches, punch.total)} of ${punch.total} on your card.`
        : manifest.outcome
            .replace(/^You will pay /, 'You paid ')
            .replace(/^You will /, 'You ')
            .replace(' and join ', ' and joined ')
            .replace(' and be ', ' and were ');

  const timelineSteps = mode === 'redeem' ? redeemSteps : manifest.workflow.steps;

  return (
    <Screen scroll={runState !== 'form'} style={runState === 'form' ? { flex: 1 } : undefined}>
      {/* header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <BackButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/store'))} />
        <View style={{ flex: 1 }}>
          <Txt size={16} w={800}>
            {ens === 'draft' ? manifest.name : listing.runtimeTitle}
          </Txt>
          <Txt size={12} w={600} color={C.blueLink}>
            {manifest.ensName}
          </Txt>
        </View>
        <Chip
          label="✦ Ask assistant"
          bg={C.blueSoft}
          color={C.blueLink}
          size={11.5}
          px={12}
          py={7}
          onPress={() => router.push('/assistant')}
        />
      </View>

      {runState === 'form' && (
        <View style={{ flex: 1, marginTop: 16 }}>
          <View
            style={{
              backgroundColor: C.surface,
              borderRadius: 22,
              paddingVertical: 6,
              paddingHorizontal: 18,
            }}
          >
            {amount && <FormRow label="Amount" value={`$${amount.default} ${amount.token}`} bold={800} />}
            {source && <FormRow label="Pay from" value={source.value === 'any' ? 'Any chain' : source.value} />}
            {recipient && <FormRow label="Destination" value={recipient.value} valueColor={C.blueLink} />}
            {memo && <FormRow label="Memo" value={memo.default} bold={600} last />}
            {!amount && !source && !recipient && !memo && (
              <FormRow label="Action" value={submit?.label ?? 'Run'} bold={600} last />
            )}
          </View>

          <View
            style={{
              backgroundColor: C.blueSoft,
              borderRadius: 18,
              paddingVertical: 15,
              paddingHorizontal: 18,
              marginTop: 10,
            }}
          >
            <Txt size={13.5} color={C.blueBody} lh={1.5}>
              <Txt size={13.5} w={700} color={C.blueBody}>
                Outcome:
              </Txt>{' '}
              {cardFull && punch
                ? `your free ${punch.reward} is ready — redeeming issues a voucher and resets your card. No payment needed. `
                : `${manifest.outcome.replace(/^You will/, 'you will')} `}
              {!cardFull && manifest.permissions.worldPolicy === 'one-payment-per-human'
                ? 'One payment per verified human. '
                : !cardFull && manifest.permissions.requiresWorldId
                  ? 'One per verified human. '
                  : ''}
              You confirm before anything moves.
            </Txt>
          </View>

          <View style={{ flex: 1 }} />
          <PrimaryButton
            label={
              paying
                ? 'Checking World ID…'
                : cardFull && punch
                  ? `Redeem free ${punch.reward}`
                  : (submit?.label ?? 'Run')
            }
            onPress={cardFull ? redeem : pay}
            style={{ marginTop: 16 }}
          />
          {cardFull && (
            <Pressable onPress={pay} style={{ alignSelf: 'center', marginTop: 12 }}>
              <Txt size={13} w={600} color={C.blueLink}>
                or pay & collect another stamp
              </Txt>
            </Pressable>
          )}
        </View>
      )}

      {runState === 'processing' && (
        <View style={{ marginTop: 20 }}>
          <Txt size={18} w={800}>
            {mode === 'redeem' ? 'Redeeming your reward…' : 'Running your flow…'}
          </Txt>
          <Txt size={13} color={C.text2} style={{ marginTop: 4 }}>
            {mode === 'redeem'
              ? `${manifest.name} · reward voucher · no payment needed`
              : `${manifest.workflow.provider} · ${manifest.workflow.steps.length} steps · simulated before execution`}
          </Txt>
          <View
            style={{
              backgroundColor: C.surface,
              borderRadius: 22,
              paddingVertical: 20,
              paddingHorizontal: 18,
              marginTop: 16,
              gap: 18,
            }}
          >
            {timelineSteps.map((step, i) => {
              const done = runStep > i;
              const active = runStep === i;
              const dot = (
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: done ? C.successStrong : active ? C.blueSoft : C.stepIdleBg,
                  }}
                >
                  <Txt size={12} w={700} color={done ? C.white : active ? C.blueLink : C.stepIdleNum}>
                    {done ? '✓' : i + 1}
                  </Txt>
                </View>
              );
              return (
                <View key={step.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
                  {active ? <Pulse borderRadius={13}>{dot}</Pulse> : dot}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt size={14.5} w={700} color={done || active ? C.text : C.text3}>
                      {step.label}
                    </Txt>
                    <Txt size={12} color={C.text3} style={{ marginTop: 1 }}>
                      {step.detail}
                    </Txt>
                  </View>
                  <Txt size={11.5} w={700} color={done ? C.successStrong : active ? C.blueLink : C.text3}>
                    {done ? 'Done' : active ? 'In progress' : 'Queued'}
                  </Txt>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {runState === 'done' && (
        <View style={{ alignItems: 'center', paddingHorizontal: 14, paddingTop: 120 }}>
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
          <Txt size={25} w={800} ls={-0.015} style={{ marginTop: 22 }}>
            {mode === 'redeem' ? 'Enjoy!' : 'Done.'}
          </Txt>
          <Txt size={15} color={C.text2} lh={1.55} center style={{ marginTop: 10, maxWidth: 270 }}>
            {doneCopy}
          </Txt>
          {mode === 'purchase' && result && !result.live && (
            <Txt size={12} color={C.text3} center style={{ marginTop: 8, maxWidth: 280 }}>
              Simulated run — fund the wallet on the Profile tab to move real USDC.
            </Txt>
          )}
          {mode === 'purchase' && (
            <Pressable
              onPress={() =>
                result?.explorerUrl
                  ? Linking.openURL(result.explorerUrl)
                  : Alert.alert(
                      'Flow details',
                      `${manifest.workflow.provider}\nFlow ${manifest.workflow.flowId}\n${manifest.workflow.steps.length} steps completed`
                    )
              }
              style={{ marginTop: 18 }}
            >
              <Txt size={13} w={600} color={C.blueLink}>
                {result?.explorerUrl ? 'View transaction' : 'View flow details'}
              </Txt>
            </Pressable>
          )}
          <Pressable
            onPress={() => router.replace('/home')}
            style={{
              backgroundColor: C.cta,
              borderRadius: 16,
              paddingVertical: 16,
              paddingHorizontal: 44,
              marginTop: 30,
            }}
          >
            <Txt size={15} w={700} color={C.ctaText}>
              Back to home
            </Txt>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}
