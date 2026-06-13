import { LinearGradient } from 'expo-linear-gradient';
import { usePathname, useRouter } from 'expo-router';
import { House, ScanLine, Sparkles, Store, User } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../state/store';
import { bgWithAlpha, C } from '../theme';
import { Txt } from './ui';

type Tab = 'home' | 'store' | 'create' | 'profile';

const ROUTE_TO_TAB: Record<string, Tab> = {
  '/home': 'home',
  '/store': 'store',
  '/assistant': 'create',
  '/profile': 'profile',
};

/** Approx bottom space the floating bar occupies above the safe-area inset
 *  (use as content padding so nothing hides behind it). */
export const TABBAR_CLEARANCE = 88;

/**
 * Persistent bottom tab bar — rendered ONCE in the root layout so it never
 * unmounts between tab switches (that remount was the "flash"). It reads the
 * current route to pick the active tab and whether to show, and animates in/out.
 * On the Create tab it stays until the assistant goes immersive (the user starts
 * typing), then slides away for a full-screen chat.
 */
export function TabBar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const immersive = useApp((s) => s.assistantImmersive);
  useApp((s) => s.themeMode); // repaint on theme toggle

  const active = ROUTE_TO_TAB[pathname];
  const visible = !!active && !(active === 'create' && immersive);

  const v = useRef(new Animated.Value(visible ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: visible ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, v]);

  const color = (t: Tab) => (active === t ? C.text : C.text3);
  const go = (t: Tab) => {
    const path = t === 'create' ? '/assistant' : `/${t}`;
    if (pathname !== path) router.replace(path as any);
  };

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        opacity: v,
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }],
      }}
      pointerEvents={visible ? 'box-none' : 'none'}
    >
      <LinearGradient
        colors={[bgWithAlpha(0), C.bg, C.bg]}
        locations={[0, 0.4, 1]}
        style={{ paddingHorizontal: 22, paddingTop: 26, paddingBottom: Math.max(insets.bottom, 12) + 12 }}
        pointerEvents="box-none"
      >
        <View
          style={{
            backgroundColor: C.surface,
            borderRadius: 999,
            paddingVertical: 9,
            paddingHorizontal: 18,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            shadowColor: '#0B1020',
            shadowOpacity: 0.1,
            shadowRadius: 26,
            shadowOffset: { width: 0, height: 8 },
            elevation: 8,
          }}
        >
          <Pressable testID="tab-home" onPress={() => go('home')} style={{ alignItems: 'center', gap: 3, width: 52 }}>
            <House size={20} color={color('home')} strokeWidth={2.4} />
            <Txt size={10.5} w={700} color={color('home')}>
              Home
            </Txt>
          </Pressable>
          <Pressable testID="tab-store" onPress={() => go('store')} style={{ alignItems: 'center', gap: 3, width: 52 }}>
            <Store size={20} color={color('store')} strokeWidth={2.4} />
            <Txt size={10.5} w={700} color={color('store')}>
              Store
            </Txt>
          </Pressable>
          {/* Scan — the center action: QR codes in the real world launch dapps */}
          <Pressable
            testID="tab-scan"
            onPress={() => router.push('/scan')}
            style={{ alignItems: 'center', width: 52, marginTop: -26 }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: C.cta,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#0B1020',
                shadowOpacity: 0.3,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 8 },
                elevation: 10,
              }}
            >
              <ScanLine size={23} color={C.ctaText} strokeWidth={2.4} />
            </View>
            <Txt size={10.5} w={700} color={C.text3} style={{ marginTop: 4 }}>
              Scan
            </Txt>
          </Pressable>
          <Pressable
            testID="tab-create"
            onPress={() => go('create')}
            style={{ alignItems: 'center', gap: 3, width: 52 }}
          >
            <Sparkles size={20} color={color('create')} strokeWidth={2.4} />
            <Txt size={10.5} w={700} color={color('create')}>
              Create
            </Txt>
          </Pressable>
          <Pressable testID="tab-profile" onPress={() => go('profile')} style={{ alignItems: 'center', gap: 3, width: 52 }}>
            <User size={20} color={color('profile')} strokeWidth={2.4} />
            <Txt size={10.5} w={700} color={color('profile')}>
              Profile
            </Txt>
          </Pressable>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}
