import { useRouter } from 'expo-router';
import { Search, Sparkles, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { BackButton, Chip, IconTile, ListRow, OpenPill, Txt } from '../src/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import { filterListings, useApp } from '../src/state/store';
import { C } from '../src/theme';

const SUGGESTIONS = ['Rewards', 'Pay', 'Food', 'Vote', 'Fundraise', 'Swap'];

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listings = useApp((s) => s.listings);
  useApp((s) => s.themeMode); // repaint on theme toggle
  const [query, setQuery] = useState('');

  const results = filterListings(listings, query);
  const open = (ens: string) => router.push(`/detail/${ens}`);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <BackButton onPress={() => (router.canGoBack() ? router.back() : router.replace('/store'))} />
          <View
            style={{
              flex: 1,
              backgroundColor: C.surface,
              borderRadius: 999,
              paddingVertical: 12,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Search size={17} color={C.text3} strokeWidth={2.4} />
            <TextInput
              testID="search-input"
              value={query}
              onChangeText={setQuery}
              placeholder="Search dapps…"
              placeholderTextColor={C.text3}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              style={{
                flex: 1,
                fontSize: 14.5,
                fontFamily: 'Geist_400Regular',
                color: C.text,
                padding: 0,
              }}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <X size={16} color={C.text3} strokeWidth={2.4} />
              </Pressable>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {query.length === 0 ? (
          <>
            <Txt size={11} w={700} color={C.text3} ls={0.05} style={{ textTransform: 'uppercase' }}>
              Try searching for
            </Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
              {SUGGESTIONS.map((s) => (
                <Chip key={s} label={s} bg={C.surface} color={C.text2} size={13} px={14} py={9} onPress={() => setQuery(s)} />
              ))}
            </View>
          </>
        ) : results.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 50 }}>
            <Txt size={15} w={700}>
              No dapps match “{query}”
            </Txt>
            <Txt size={13} color={C.text2} center style={{ marginTop: 6, maxWidth: 260 }}>
              Can’t find it? Describe what you need and the assistant will build it.
            </Txt>
            <Pressable
              onPress={() => router.push('/assistant')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: C.cta,
                borderRadius: 14,
                paddingVertical: 13,
                paddingHorizontal: 20,
                marginTop: 18,
              }}
            >
              <Sparkles size={15} color={C.ctaText} strokeWidth={2.4} />
              <Txt size={14} w={700} color={C.ctaText}>
                Ask the assistant
              </Txt>
            </Pressable>
          </View>
        ) : (
          <>
            <Txt size={12.5} color={C.text2} style={{ marginBottom: 10 }}>
              {results.length} {results.length === 1 ? 'result' : 'results'}
            </Txt>
            <View style={{ gap: 8 }}>
              {results.map((l) => (
                <ListRow
                  key={l.manifest.ensName}
                  icon={<IconTile label={l.monogram} />}
                  title={l.manifest.name}
                  sub={`${l.manifest.category} · ${l.oneLiner}`}
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
      </ScrollView>
    </View>
  );
}
