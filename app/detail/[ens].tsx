import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Heart, Share2, Star } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { QR } from '../../src/components/QR';
import { BackButton, Chip, DappAvatar, PrimaryButton, Screen, Txt } from '../../src/components/ui';
import { dappEmoji } from '../../src/dappStyle';
import { shareLink } from '../../src/services/links';
import { verifyHuman } from '../../src/services/verification';
import { findListing, hasListing, useApp } from '../../src/state/store';
import { C } from '../../src/theme';

function MicroLabel({ text, color = C.text3 }: { text: string; color?: string }) {
  return (
    <Txt size={11} w={700} color={color} ls={0.05} style={{ textTransform: 'uppercase' }}>
      {text}
    </Txt>
  );
}

/** Tappable 1–5 star selector / read-only star row. */
function Stars({
  value,
  onChange,
  size = 22,
}: {
  value: number;
  onChange?: (n: number) => void;
  size?: number;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const star = (
          <Star
            size={size}
            color={filled ? C.warn : C.text3}
            fill={filled ? C.warn : 'transparent'}
            strokeWidth={2}
          />
        );
        return onChange ? (
          <Pressable key={n} onPress={() => onChange(n)} hitSlop={4}>
            {star}
          </Pressable>
        ) : (
          <View key={n}>{star}</View>
        );
      })}
    </View>
  );
}

export default function Detail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { ens } = useLocalSearchParams<{ ens: string }>();
  useApp((s) => s.themeMode); // repaint on theme toggle
  const savedEns = useApp((s) => s.savedEns);
  const toggleSave = useApp((s) => s.toggleSave);
  const addShortcut = useApp((s) => s.addShortcut);
  const removeShortcut = useApp((s) => s.removeShortcut);
  const reviewsByEns = useApp((s) => s.reviews);
  const submitReview = useApp((s) => s.submitReview);
  const recordActivity = useApp((s) => s.recordActivity);

  const [showReview, setShowReview] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [draftRating, setDraftRating] = useState(0);
  const [draftText, setDraftText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Unknown ENS → not-found state instead of silently showing listings[0].
  if (ens && !hasListing(ens)) {
    return (
      <Screen scroll={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <BackButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/store'))} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 }}>
          <Txt size={20} w={800}>
            Dapp not found
          </Txt>
          <Txt size={14} color={C.text2} center lh={1.5} style={{ marginTop: 8, maxWidth: 280 }}>
            “{ens}” isn’t in the store. It may not be published yet, or the link is mistyped.
          </Txt>
          <Pressable
            onPress={() => router.replace('/store')}
            style={{ backgroundColor: C.cta, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24, marginTop: 22 }}
          >
            <Txt size={14} w={700} color={C.ctaText}>
              Browse the store
            </Txt>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const listing = findListing(ens);
  const m = listing.manifest;
  const saved = savedEns.includes(m.ensName);

  // Favoriting (the heart) also pins the dapp to the Home shortcut grid, and
  // un-favoriting removes it (issue #3).
  const toggleFavorite = () => {
    const id = `dapp:${m.ensName}`;
    if (saved) {
      removeShortcut(id);
    } else {
      addShortcut({
        id,
        emoji: dappEmoji(m.ensName, m.category),
        label: m.name,
        route: `/detail/${m.ensName}`,
      });
    }
    toggleSave(m.ensName);
  };

  const userReviews = reviewsByEns[m.ensName] ?? [];
  const combinedCount = listing.reviews + userReviews.length;
  const combinedRating =
    combinedCount > 0
      ? (listing.rating * listing.reviews + userReviews.reduce((s, r) => s + r.rating, 0)) /
        combinedCount
      : listing.rating;

  const onSubmitReview = async () => {
    if (submitting || draftRating === 0 || !draftText.trim()) return;
    setSubmitting(true);
    try {
      const v = await verifyHuman({ signal: `review:${m.ensName}` });
      if (!v.verified) {
        Alert.alert('World ID required', v.error ?? 'Verify you are human to post a review.');
        return;
      }
      submitReview(m.ensName, {
        rating: draftRating,
        text: draftText.trim(),
        nullifier: v.nullifierHash ?? '0xsimulated',
        ts: Date.now(),
      });
      recordActivity({ ens: m.ensName, title: m.name, kind: 'review' });
      setShowReview(false);
      setDraftText('');
      setDraftRating(0);
    } catch (e) {
      Alert.alert('Could not post review', String(e).slice(0, 200));
    } finally {
      setSubmitting(false);
    }
  };

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
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* pinned header — stays put as the body scrolls */}
      <View
        style={{
          paddingTop: insets.top + 10,
          paddingHorizontal: 20,
          paddingBottom: 10,
          backgroundColor: C.bg,
          borderBottomWidth: 1,
          borderBottomColor: C.dividerSoft,
        }}
      >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/store'))} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={showTechnical}>
            <Txt size={13} w={600} color={C.text2}>
              Details
            </Txt>
          </Pressable>
          <Pressable
            testID="detail-share"
            onPress={() => setShowShare((s) => !s)}
            hitSlop={8}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: C.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Share2 size={17} color={showShare ? C.blueLink : C.text2} strokeWidth={2.2} />
          </Pressable>
          <Pressable
            testID="detail-save"
            onPress={toggleFavorite}
            hitSlop={8}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: C.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Heart
              size={18}
              color={saved ? C.danger : C.text2}
              fill={saved ? C.danger : 'transparent'}
              strokeWidth={2.2}
            />
          </Pressable>
        </View>
      </View>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 112 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >

      {/* share panel */}
      {showShare && (
        <View style={{ backgroundColor: C.surface, borderRadius: 22, padding: 18, marginTop: 14, alignItems: 'center' }}>
          <Txt size={13} w={700} color={C.text2}>
            Scan to open “{m.name}”
          </Txt>
          <View style={{ marginTop: 12 }}>
            <QR value={shareLink(m.ensName)} size={168} />
          </View>
          <Pressable
            onPress={() => {
              Clipboard.setStringAsync(shareLink(m.ensName));
              Alert.alert('Copied', 'Share link copied to clipboard.');
            }}
            style={{ marginTop: 12 }}
          >
            <Txt size={12.5} w={600} color={C.blueLink}>
              Copy link
            </Txt>
          </Pressable>
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 18 }}>
        <DappAvatar ens={listing.manifest.ensName} category={listing.manifest.category} size={64} radius={21} />
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
            <View key={p} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
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
            {m.permissions.spendingCap.includes('USDC') &&
            Number.isFinite(parseFloat(m.permissions.spendingCap))
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

      {/* Reviews */}
      <View style={{ backgroundColor: C.surface, borderRadius: 22, padding: 18, marginTop: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <MicroLabel text="Ratings & reviews" />
          {!showReview && (
            <Pressable onPress={() => setShowReview(true)}>
              <Txt size={12.5} w={700} color={C.blueLink}>
                Write a review
              </Txt>
            </Pressable>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 }}>
          <Txt size={30} w={800}>
            {combinedRating.toFixed(1)}
          </Txt>
          <View>
            <Stars value={Math.round(combinedRating)} size={16} />
            <Txt size={12} color={C.text2} style={{ marginTop: 4 }}>
              {listing.runs} runs · {combinedCount} verified reviews · one per human
            </Txt>
          </View>
        </View>

        {/* composer */}
        {showReview && (
          <View
            style={{
              backgroundColor: C.bg,
              borderRadius: 16,
              padding: 14,
              marginTop: 14,
            }}
          >
            <Txt size={12.5} w={700} color={C.text2}>
              Your rating
            </Txt>
            <View style={{ marginTop: 8 }}>
              <Stars value={draftRating} onChange={setDraftRating} />
            </View>
            <TextInput
              value={draftText}
              onChangeText={setDraftText}
              placeholder="Share how it went…"
              placeholderTextColor={C.text3}
              multiline
              style={{
                backgroundColor: C.surface,
                borderRadius: 12,
                padding: 12,
                marginTop: 12,
                minHeight: 64,
                fontSize: 14,
                fontFamily: 'Geist_400Regular',
                color: C.text,
                textAlignVertical: 'top',
              }}
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Pressable
                onPress={() => {
                  setShowReview(false);
                  setDraftText('');
                  setDraftRating(0);
                }}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: C.dividerSoft }}
              >
                <Txt size={13.5} w={700} color={C.text2}>
                  Cancel
                </Txt>
              </Pressable>
              <Pressable
                onPress={onSubmitReview}
                style={{
                  flex: 2,
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: draftRating && draftText.trim() ? C.cta : C.segBg,
                }}
              >
                <Txt size={13.5} w={700} color={draftRating && draftText.trim() ? C.ctaText : C.text3}>
                  {submitting ? 'Verifying with World ID…' : 'Post (1 per human)'}
                </Txt>
              </Pressable>
            </View>
          </View>
        )}

        {/* user reviews */}
        {userReviews.length > 0 && (
          <View style={{ gap: 12, marginTop: 16 }}>
            {userReviews.map((r, i) => (
              <View key={`${r.nullifier}-${r.ts}`} style={{ borderTopWidth: i === 0 ? 0 : 1, borderTopColor: C.dividerSoft, paddingTop: i === 0 ? 0 : 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Stars value={r.rating} size={13} />
                  <Chip label="✓ Verified human" bg={C.successBg} color={C.success} size={10.5} px={9} py={4} />
                </View>
                <Txt size={13.5} color={C.textBody} lh={1.5} style={{ marginTop: 7 }}>
                  {r.text}
                </Txt>
              </View>
            ))}
          </View>
        )}
      </View>
      </ScrollView>
      {/* pinned Run button — stays put at the bottom */}
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
          testID="detail-run"
          label="Run dapp"
          onPress={() => router.push(`/runtime/${m.ensName}`)}
        />
      </View>
    </View>
  );
}
