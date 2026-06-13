import React, { PropsWithChildren, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleProp,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Search } from 'lucide-react-native';
import { C, font } from '../theme';

/** Typography helper: Geist with explicit weight mapping. */
export function Txt({
  size = 14,
  w = 400,
  color = C.text,
  lh,
  ls,
  center,
  style,
  children,
  numberOfLines,
}: PropsWithChildren<{
  size?: number;
  w?: 400 | 500 | 600 | 700 | 800;
  color?: string;
  lh?: number;
  ls?: number;
  center?: boolean;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}>) {
  return (
    <Animated.Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily: font(w),
          fontSize: size,
          color,
          lineHeight: lh ? size * lh : undefined,
          letterSpacing: ls ? ls * size : undefined,
          textAlign: center ? 'center' : undefined,
        },
        style,
      ]}
    >
      {children}
    </Animated.Text>
  );
}

/** Screen-enter animation: fadeUp — translateY(10px)→0 + fade, 0.3s ease. */
export function FadeUp({
  children,
  style,
  delay = 0,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; delay?: number }>) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 300,
      delay,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [v, delay]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v,
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Looping glow: emulates `box-shadow 0 0 0 0 rgba(134,164,244,.45) → 0 0 0 9px transparent`. */
export function Pulse({
  children,
  borderRadius = 999,
  duration = 1400,
  style,
}: PropsWithChildren<{ borderRadius?: number; duration?: number; style?: StyleProp<ViewStyle> }>) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(v, { toValue: 1, duration, easing: Easing.out(Easing.ease), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [v, duration]);
  return (
    <View style={style}>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius,
          backgroundColor: C.accent,
          opacity: v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.45, 0, 0] }),
          transform: [
            { scaleX: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) },
            { scaleY: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) },
          ],
        }}
      />
      {children}
    </View>
  );
}

/** Three blinking dots, 1.2s loop with 0.2s stagger. */
export function TypingDots() {
  const dots = [useRef(new Animated.Value(0.25)).current, useRef(new Animated.Value(0.25)).current, useRef(new Animated.Value(0.25)).current];
  useEffect(() => {
    const loops = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(d, { toValue: 1, duration: 480, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0.25, duration: 480, useNativeDriver: true }),
          Animated.delay((2 - i) * 200),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      {dots.map((d, i) => (
        <Animated.View
          key={i}
          style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.text3, opacity: d }}
        />
      ))}
    </View>
  );
}

export function Chip({
  label,
  bg,
  color,
  size = 11.5,
  w = 700,
  px = 11,
  py = 6,
  onPress,
}: {
  label: string;
  bg: string;
  color: string;
  size?: number;
  w?: 600 | 700;
  px?: number;
  py?: number;
  onPress?: () => void;
}) {
  const inner = (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: px, paddingVertical: py, alignSelf: 'flex-start' }}>
      <Txt size={size} w={w} color={color}>
        {label}
      </Txt>
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{inner}</Pressable> : inner;
}

/** Two-letter monogram on a soft-blue tile — the default dapp icon. */
export function IconTile({
  label,
  size = 44,
  radius = 14,
  bg = C.blueSoft,
  color = C.blueLink,
  fontSize,
}: {
  label: string;
  size?: number;
  radius?: number;
  bg?: string;
  color?: string;
  fontSize?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Txt size={fontSize ?? Math.round(size * 0.33)} w={800} color={color}>
        {label}
      </Txt>
    </View>
  );
}

export function SearchPill({ placeholder, onPress }: { placeholder: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: C.surface,
        borderRadius: 999,
        paddingVertical: 14,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <Search size={17} color={C.text3} strokeWidth={2.4} />
      <Txt size={14.5} color={C.text3}>
        {placeholder}
      </Txt>
    </Pressable>
  );
}

export function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: C.surface,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ArrowLeft size={18} color={C.text} strokeWidth={2} />
    </Pressable>
  );
}

export function PrimaryButton({
  label,
  onPress,
  style,
  leading,
}: {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  leading?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          backgroundColor: C.cta,
          borderRadius: 16,
          padding: 17,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 9,
        },
        style,
      ]}
    >
      {leading}
      <Txt size={16} w={700} color={C.ctaText}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function SectionHeader({
  title,
  link,
  onLink,
  size = 18,
}: {
  title: string;
  link?: string;
  onLink?: () => void;
  size?: number;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 24,
        marginBottom: 10,
      }}
    >
      <Txt size={size} w={800} ls={-0.01}>
        {title}
      </Txt>
      {link ? (
        <Pressable onPress={onLink}>
          <Txt size={13} w={600} color={C.blueLink}>
            {link}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Schedule-style list row: left rail (uppercase category) or icon tile. */
export function ListRow({
  rail,
  icon,
  title,
  sub,
  right,
  onPress,
}: {
  rail?: string;
  icon?: React.ReactNode;
  title: string;
  sub: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  const body = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: C.surface,
        borderRadius: 20,
        padding: 16,
      }}
    >
      {rail !== undefined ? (
        <View style={{ width: 58 }}>
          <Txt size={10.5} w={700} color={C.text3} ls={0.06} lh={1.35} style={{ textTransform: 'uppercase' }}>
            {rail}
          </Txt>
        </View>
      ) : null}
      {icon}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt size={15.5} w={700}>
          {title}
        </Txt>
        <Txt size={13} color={C.text2} style={{ marginTop: 2 }}>
          {sub}
        </Txt>
      </View>
      {right}
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{body}</Pressable> : body;
}

export function OpenPill() {
  return (
    <View style={{ backgroundColor: C.cta, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 7 }}>
      <Txt size={12} w={700} color={C.ctaText}>
        Open
      </Txt>
    </View>
  );
}

/**
 * Scrollable screen container: 20px horizontal padding, fadeUp on enter.
 * `padBottom` is measured from the TOP of the system safe area — the bottom
 * inset (Android nav bar / iOS home indicator) is always added on top so
 * content and CTAs never sit under system UI (SDK 54 renders edge-to-edge).
 */
export function Screen({
  children,
  scroll = true,
  padBottom = 16,
  style,
}: PropsWithChildren<{ scroll?: boolean; padBottom?: number; style?: StyleProp<ViewStyle> }>) {
  const insets = useSafeAreaInsets();
  const basePad = {
    paddingTop: insets.top + 10,
    paddingHorizontal: 20,
    paddingBottom: padBottom + Math.max(insets.bottom, 12),
  };
  if (!scroll) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <FadeUp style={[{ flex: 1 }, basePad, style]}>{children}</FadeUp>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FadeUp style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[basePad, style]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </FadeUp>
    </View>
  );
}
