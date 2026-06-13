import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { TabBar } from '../src/components/TabBar';
import { Chip, IconTile, ListRow, OpenPill, Screen, SearchPill, SectionHeader, Txt } from '../src/components/ui';
import { useApp } from '../src/state/store';
import { DappListing } from '../src/types';
import { C } from '../src/theme';

const CATEGORIES = ['All', 'Finance', 'Community', 'Agents', 'Events', 'Tools'];

function FeaturedCard({ listing, onPress }: { listing: DappListing; onPress: () => void }) {
  const m = listing.manifest;
  return (
    <Pressable
      onPress={onPress}
      style={{ backgroundColor: C.blueSoft, borderRadius: 26, padding: 20, width: 250 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconTile label={listing.monogram} size={44} radius={15} bg={C.surface} fontSize={15} />
        <Chip label="Featured" bg={C.surface} color={C.blueLink} size={10.5} px={10} py={5} />
      </View>
      <Txt size={17} w={800} color={C.blueInk} style={{ marginTop: 14 }}>
        {m.name}
      </Txt>
      <Txt size={12.5} color={C.blueMeta} style={{ marginTop: 3 }}>
        {m.ensName === 'daovote.dappdock.eth' ? m.creator : m.ensName}
      </Txt>
      <Txt size={13} color={C.blueBody} lh={1.45} style={{ marginTop: 9 }}>
        {listing.oneLiner}
      </Txt>
      <View style={{ flexDirection: 'row', gap: 5, marginTop: 13 }}>
        <Chip label="ENS" bg={C.surface} color={C.blueLink} size={10.5} px={9} py={4} />
        {m.trust.worldVerifiedCreator ? (
          <Chip label="✓ World" bg={C.surface} color={C.success} size={10.5} px={9} py={4} />
        ) : null}
        {m.ensName === 'hackdues.dappdock.eth' ? (
          <Chip label="Simulated" bg={C.surface} color={C.warn} size={10.5} px={9} py={4} />
        ) : null}
      </View>
    </Pressable>
  );
}

export default function StoreScreen() {
  const router = useRouter();
  const listings = useApp((s) => s.listings);
  useApp((s) => s.themeMode); // repaint on theme toggle
  const { category: categoryParam } = useLocalSearchParams<{ category?: string }>();
  const [category, setCategory] = useState(
    categoryParam && CATEGORIES.includes(categoryParam) ? categoryParam : 'All'
  );

  useEffect(() => {
    if (categoryParam && CATEGORIES.includes(categoryParam)) setCategory(categoryParam);
  }, [categoryParam]);

  const open = (ens: string) => router.push(`/detail/${ens}`);
  const inCategory = (l: DappListing) =>
    category === 'All' ||
    l.manifest.category === category ||
    l.manifest.secondaryCategory === category;

  const featured = listings.filter((l) => l.featured && inCategory(l));
  const humans = listings.filter((l) => l.section === 'humans' && inCategory(l));
  const agents = listings.filter((l) => l.section === 'agents' && inCategory(l));
  const recent = listings.filter((l) => l.section === 'recent' && inCategory(l));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen padBottom={120}>
        <Txt size={28} w={800} ls={-0.015}>
          Store
        </Txt>
        <View style={{ marginTop: 14 }}>
          <SearchPill placeholder="Search the store…" />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 14, marginHorizontal: -20 }}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 7 }}
        >
          {CATEGORIES.map((c) => {
            const on = c === category;
            return (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={{
                  backgroundColor: on ? C.cta : C.surface,
                  borderRadius: 999,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                }}
              >
                <Txt size={13} w={on ? 700 : 600} color={on ? C.ctaText : C.text2}>
                  {c}
                </Txt>
              </Pressable>
            );
          })}
        </ScrollView>

        {featured.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 16, marginHorizontal: -20 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 4, gap: 10 }}
          >
            {featured.map((l) => (
              <FeaturedCard key={l.manifest.ensName} listing={l} onPress={() => open(l.manifest.ensName)} />
            ))}
          </ScrollView>
        )}

        {humans.length > 0 && (
          <>
            <SectionHeader title="Verified by humans" />
            <View style={{ gap: 8 }}>
              {humans.map((l) => (
                <ListRow
                  key={l.manifest.ensName}
                  icon={<IconTile label={l.monogram} />}
                  title={l.manifest.name}
                  sub={`${l.manifest.creator} · ${l.oneLiner}`}
                  right={
                    l.manifest.permissions.requiresWorldId ? (
                      <Chip label="✓ World" bg={C.successBg} color={C.success} />
                    ) : (
                      <OpenPill />
                    )
                  }
                  onPress={() => open(l.manifest.ensName)}
                />
              ))}
            </View>
          </>
        )}

        {agents.length > 0 && (
          <>
            <SectionHeader title="Built with agents" />
            <View style={{ gap: 8 }}>
              {agents.map((l) => (
                <ListRow
                  key={l.manifest.ensName}
                  icon={<IconTile label={l.monogram} />}
                  title={l.manifest.name}
                  sub={`${l.manifest.creator} · Human-backed agents`}
                  right={<Chip label="ENS verified" bg={C.blueSoft} color={C.blueLink} />}
                  onPress={() => open(l.manifest.ensName)}
                />
              ))}
            </View>
          </>
        )}

        {recent.length > 0 && (
          <>
            <SectionHeader title="Recently published" />
            <View style={{ gap: 8 }}>
              {recent.map((l) => {
                const isFresh = l.recency === 'Just now';
                return (
                  <ListRow
                    key={l.manifest.ensName}
                    rail={l.recency ?? 'New'}
                    title={l.manifest.name}
                    sub={`${l.manifest.ensName} · by ${l.manifest.creator}`}
                    right={
                      isFresh ? (
                        <OpenPill />
                      ) : (
                        <Chip label="Simulated" bg={C.warnBg} color={C.warn} />
                      )
                    }
                    onPress={() => open(l.manifest.ensName)}
                  />
                );
              })}
            </View>
          </>
        )}

      </Screen>
      <TabBar active="store" />
    </View>
  );
}
