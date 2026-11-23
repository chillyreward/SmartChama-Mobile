// Akibora mobile UI kit. Mirrors the web kit (src/components/ui on web) so both
// apps look like one product: forest and mint, Newsreader for headings and
// money, Onest for everything else.
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { fonts } from '../theme/fonts';
import type { Palette } from '../theme/colors';

export type IconName = keyof typeof Ionicons.glyphMap;
export { fonts };

/* ------------------------------------------------------------------ */
/* Money and names                                                     */
/* ------------------------------------------------------------------ */
export function formatKsh(n: number | null | undefined) {
  const v = Number(n ?? 0);
  return `KSh ${Math.round(v).toLocaleString('en-KE')}`;
}

export function initialsOf(name?: string | null) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return ((parts[0][0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export const ROLE_LABEL: Record<string, string> = {
  admin: 'Group admin',
  chairlady: 'Chair',
  treasurer: 'Treasurer',
  secretary: 'Secretary',
  member: 'Member',
};
export const OFFICIAL_ROLES = ['admin', 'chairlady', 'treasurer', 'secretary'];

export function shortDate(d?: string | null, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-KE', opts);
}

/* ------------------------------------------------------------------ */
/* Text                                                                */
/* ------------------------------------------------------------------ */
type Variant = 'hero' | 'display' | 'title' | 'body' | 'bodyStrong' | 'small' | 'smallStrong' | 'caption' | 'money' | 'moneyLg' | 'mono';
type Tone = 'ink' | 'ink2' | 'ink3' | 'brand' | 'danger' | 'onForest' | 'onForest2' | 'onForest3' | 'onPrimary' | 'sageInk' | 'forest' | 'mint' | 'amberInk';

const VARIANT: Record<Variant, TextStyle> = {
  hero: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: -0.8 },
  display: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, letterSpacing: -0.5 },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 27, letterSpacing: -0.2 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
  small: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  smallStrong: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 17 },
  money: { fontFamily: fonts.display, fontSize: 19, lineHeight: 24 },
  moneyLg: { fontFamily: fonts.display, fontSize: 38, lineHeight: 44, letterSpacing: -0.6 },
  mono: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 18 },
};

function toneColor(c: Palette, tone: Tone) {
  switch (tone) {
    case 'ink': return c.ink;
    case 'ink2': return c.ink2;
    case 'ink3': return c.ink3;
    case 'brand': return c.brand;
    case 'danger': return c.danger;
    case 'onForest': return c.onForest;
    case 'onForest2': return c.onForest2;
    case 'onForest3': return c.onForest3;
    case 'onPrimary': return c.onPrimary;
    case 'sageInk': return c.sageInk;
    case 'forest': return c.forest;
    case 'mint': return c.mint;
    case 'amberInk': return c.amberInk;
  }
}

export function T({
  v = 'body',
  tone = 'ink',
  style,
  children,
  ...rest
}: { v?: Variant; tone?: Tone; style?: StyleProp<TextStyle>; children?: React.ReactNode } & Omit<React.ComponentProps<typeof Text>, 'style'>) {
  const { colors } = useTheme();
  return (
    <Text {...rest} style={[VARIANT[v], { color: toneColor(colors, tone) }, style]}>
      {children}
    </Text>
  );
}

export function Money({ value, v = 'money', tone = 'ink', style }: { value: number | null | undefined; v?: 'money' | 'moneyLg' | 'title' | 'display'; tone?: Tone; style?: StyleProp<TextStyle> }) {
  return <T v={v} tone={tone} style={style}>{formatKsh(value)}</T>;
}

/* ------------------------------------------------------------------ */
/* Screen frame                                                        */
/* ------------------------------------------------------------------ */
export function Screen({
  title,
  subtitle,
  onBack,
  right,
  children,
  scroll = true,
  refreshing,
  onRefresh,
  padded = true,
  tabBarSpace = false,
}: {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
  /** Leave room for the floating tab bar */
  tabBarSpace?: boolean;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottom = (tabBarSpace ? 110 : 32) + insets.bottom;
  const header = (title || onBack || right) ? (
    <View style={s.header}>
      <View style={s.headerRow}>
        {onBack ? (
          <IconButton icon="arrow-back" label="Back" onPress={onBack} />
        ) : <View />}
        <View style={{ flexDirection: 'row', gap: 8 }}>{right}</View>
      </View>
      {title ? <T v="display" style={{ marginTop: onBack ? 14 : 4 }} accessibilityRole="header">{title}</T> : null}
      {subtitle ? <T v="small" tone="ink2" style={{ marginTop: 6 }}>{subtitle}</T> : null}
    </View>
  ) : null;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.page }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[padded && { paddingHorizontal: 20 }, { paddingBottom: bottom }]}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.brand} colors={[colors.brand]} /> : undefined}
        >
          {header}
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, padded && { paddingHorizontal: 20 }]}>
          {header}
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

export function IconButton({ icon, label, onPress, tone = 'surface', badge }: { icon: IconName; label: string; onPress?: () => void; tone?: 'surface' | 'forest' | 'plain'; badge?: number }) {
  const { colors } = useTheme();
  const bg = tone === 'surface' ? colors.surface : tone === 'forest' ? colors.canopy : 'transparent';
  const fg = tone === 'forest' ? colors.onForest : colors.ink;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [s.iconBtn, { backgroundColor: bg, borderColor: tone === 'surface' ? colors.line : 'transparent', opacity: pressed ? 0.7 : 1 }]}
    >
      <Ionicons name={icon} size={20} color={fg} />
      {badge ? (
        <View style={[s.badge, { backgroundColor: colors.lavender }]}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 10, color: colors.lavenderInk }}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Panels                                                              */
/* ------------------------------------------------------------------ */
type PanelTone = 'surface' | 'sage' | 'forest' | 'lavender' | 'tint' | 'plain';

export function Panel({ tone = 'surface', style, children, onPress, accessibilityLabel }: { tone?: PanelTone; style?: StyleProp<ViewStyle>; children: React.ReactNode; onPress?: () => void; accessibilityLabel?: string }) {
  const { colors, isDark } = useTheme();
  const bg = {
    surface: colors.surface,
    sage: colors.sage,
    forest: isDark ? colors.canopy : colors.forest,
    lavender: colors.lavender,
    tint: colors.tint,
    plain: 'transparent',
  }[tone];
  const border = tone === 'surface' || tone === 'plain' ? colors.line : tone === 'forest' && isDark ? colors.line : 'transparent';
  const base = [s.panel, { backgroundColor: bg, borderColor: border }, style];
  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={({ pressed }) => [base, pressed && { opacity: 0.85 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={base}>{children}</View>;
}

export function SectionTitle({ children, action, onAction }: { children: React.ReactNode; action?: string; onAction?: () => void }) {
  return (
    <View style={s.sectionTitle}>
      <T v="title">{children}</T>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button">
          <T v="smallStrong" tone="brand">{action}</T>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */
type BtnVariant = 'primary' | 'mint' | 'outline' | 'ghost' | 'forest' | 'danger' | 'onForest';

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  size = 'md',
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: BtnVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const map: Record<BtnVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: colors.primary, fg: colors.onPrimary },
    mint: { bg: colors.mint, fg: colors.forest },
    forest: { bg: colors.forest, fg: colors.onForest },
    outline: { bg: 'transparent', fg: colors.ink, border: colors.lineStrong },
    ghost: { bg: 'transparent', fg: colors.ink2 },
    danger: { bg: colors.dangerSoft, fg: colors.dangerInk },
    onForest: { bg: 'transparent', fg: colors.onForest, border: colors.moss },
  };
  const m = map[variant];
  const h = size === 'sm' ? 38 : size === 'lg' ? 56 : 48;
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        s.btn,
        { height: h, paddingHorizontal: size === 'sm' ? 16 : 22, backgroundColor: m.bg, borderColor: m.border ?? 'transparent', borderWidth: m.border ? 1 : 0, opacity: off ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={m.fg} /> : (
        <>
          {icon ? <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={m.fg} /> : null}
          <Text style={{ fontFamily: fonts.semibold, fontSize: size === 'sm' ? 14 : 16, color: m.fg }}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Chips, meters, ticks                                                */
/* ------------------------------------------------------------------ */
export type ChipKind = 'paid' | 'late' | 'pending' | 'failed' | 'info' | 'welfare' | 'neutral';

export function Chip({ kind = 'neutral', label }: { kind?: ChipKind; label: string }) {
  const { colors } = useTheme();
  const map: Record<ChipKind, [string, string]> = {
    paid: [colors.tint, colors.brand],
    late: [colors.amberSoft, colors.amberInk],
    pending: [colors.raised, colors.ink2],
    failed: [colors.dangerSoft, colors.dangerInk],
    info: [colors.sage, colors.sageInk],
    welfare: [colors.lavender, colors.lavenderInk],
    neutral: [colors.raised, colors.ink2],
  };
  const [bg, fg] = map[kind];
  return (
    <View style={[s.chip, { backgroundColor: bg }]}>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: fg }}>{label}</Text>
    </View>
  );
}

/** Segmented meter, like the web trust meter. */
export function Meter({ value, max = 100, segments = 24, height = 22, onColor, offColor }: { value: number; max?: number; segments?: number; height?: number; onColor?: string; offColor?: string }) {
  const { colors } = useTheme();
  const on = Math.round((Math.max(0, Math.min(value, max)) / max) * segments);
  return (
    <View style={{ flexDirection: 'row', gap: 3, height }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max, now: value }}>
      {Array.from({ length: segments }, (_, i) => (
        <View key={i} style={{ flex: 1, borderRadius: 2, backgroundColor: i < on ? (onColor ?? colors.brand) : (offColor ?? colors.raised) }} />
      ))}
    </View>
  );
}

export function Ticks({ total, done, onColor, offColor }: { total: number; done: number; onColor?: string; offColor?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {Array.from({ length: Math.max(total, 1) }, (_, i) => (
        <View key={i} style={{ flex: 1, height: 6, borderRadius: 2, backgroundColor: i < done ? (onColor ?? colors.brand) : (offColor ?? colors.raised) }} />
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* The ring: a dashed weave with member seats around it                 */
/* ------------------------------------------------------------------ */
export type Seat = { initials: string; state: 'received' | 'current' | 'upcoming' | 'me' };

export function Ring({ size = 260, seats = [], seatSize, children, label }: { size?: number; seats?: Seat[]; seatSize?: number; children?: React.ReactNode; label?: string }) {
  const { colors } = useTheme();
  const seat = seatSize ?? Math.max(26, Math.round(size * 0.12));
  const r = size / 2 - seat / 2 - 2;
  const currentIdx = Math.max(0, seats.findIndex((x) => x.state === 'current'));
  const bandR = r;
  return (
    <View style={{ width: size, height: size }} accessible={!!label} accessibilityLabel={label}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={bandR} stroke={colors.moss} strokeWidth={seat * 0.55} strokeDasharray="3 4" fill="none" opacity={0.9} />
      </Svg>
      {seats.map((x, i) => {
        const a = ((-90 + (i - currentIdx) * (360 / seats.length)) * Math.PI) / 180;
        const left = size / 2 + r * Math.cos(a) - seat / 2;
        const top = size / 2 + r * Math.sin(a) - seat / 2;
        const bg = x.state === 'current' ? colors.mint : x.state === 'received' ? colors.sage : x.state === 'me' ? colors.lavender : '#12271D';
        const fg = x.state === 'upcoming' ? '#C9DACF' : colors.forest;
        return (
          <View key={i} style={{ position: 'absolute', left, top, width: seat, height: seat, borderRadius: seat / 2, backgroundColor: bg, borderWidth: 1.5, borderColor: x.state === 'upcoming' ? colors.moss : bg, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: Math.max(10, seat * 0.3), color: fg }}>{x.initials}</Text>
          </View>
        );
      })}
      <View style={{ position: 'absolute', top: seat + 12, left: seat + 12, right: seat + 12, bottom: seat + 12, borderRadius: size, backgroundColor: '#12271D', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
        {children}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Rows, avatars, empty states, notices                                */
/* ------------------------------------------------------------------ */
export function Avatar({ name, size = 40, tone = 'lavender' }: { name?: string | null; size?: number; tone?: 'lavender' | 'sage' | 'mint' | 'forest' }) {
  const { colors } = useTheme();
  const bg = { lavender: colors.lavender, sage: colors.sage, mint: colors.mint, forest: colors.forest }[tone];
  const fg = tone === 'forest' ? colors.onForest : colors.forest;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: fonts.semibold, fontSize: Math.round(size * 0.36), color: fg }}>{initialsOf(name)}</Text>
    </View>
  );
}

export function Row({
  icon,
  iconTone = 'sage',
  left,
  title,
  subtitle,
  right,
  onPress,
  last,
}: {
  icon?: IconName;
  iconTone?: 'sage' | 'mint' | 'lavender' | 'raised' | 'danger';
  left?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  const { colors } = useTheme();
  const iconBg = { sage: colors.sage, mint: colors.mint, lavender: colors.lavender, raised: colors.raised, danger: colors.dangerSoft }[iconTone];
  const iconFg = iconTone === 'raised' ? colors.ink : iconTone === 'danger' ? colors.dangerInk : colors.forest;
  const body = (
    <View style={[s.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line }]}>
      {left ?? (icon ? (
        <View style={[s.rowIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={18} color={iconFg} />
        </View>
      ) : null)}
      <View style={{ flex: 1, minWidth: 0 }}>
        {typeof title === 'string' ? <T v="bodyStrong" numberOfLines={2}>{title}</T> : title}
        {subtitle ? (typeof subtitle === 'string' ? <T v="small" tone="ink2" numberOfLines={2} style={{ marginTop: 2 }}>{subtitle}</T> : subtitle) : null}
      </View>
      {right}
      {onPress && !right ? <Ionicons name="chevron-forward" size={18} color={colors.ink3} /> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => pressed && { opacity: 0.7 }}>
      {body}
    </Pressable>
  );
}

export function Empty({ icon = 'leaf-outline', title, children, action }: { icon?: IconName; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'flex-start', paddingVertical: 8 }}>
      <View style={[s.rowIcon, { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.sage }]}>
        <Ionicons name={icon} size={22} color={colors.forest} />
      </View>
      <T v="title" style={{ marginTop: 14 }}>{title}</T>
      {children ? <T v="small" tone="ink2" style={{ marginTop: 6 }}>{children}</T> : null}
      {action ? <View style={{ marginTop: 16 }}>{action}</View> : null}
    </View>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'ok' | 'warn' | 'danger'; children: React.ReactNode }) {
  const { colors } = useTheme();
  const [bg, fg] = {
    info: [colors.sage, colors.sageInk],
    ok: [colors.tint, colors.brand],
    warn: [colors.amberSoft, colors.amberInk],
    danger: [colors.dangerSoft, colors.dangerInk],
  }[tone];
  return (
    <View style={[s.notice, { backgroundColor: bg }]} accessibilityRole={tone === 'danger' ? 'alert' : undefined}>
      <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: fg }}>{children}</Text>
    </View>
  );
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingVertical: 48, alignItems: 'center', gap: 12 }} accessibilityLabel={label}>
      <ActivityIndicator color={colors.brand} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Inputs                                                              */
/* ------------------------------------------------------------------ */
export function Field({ label, hint, error, style, ...input }: { label: string; hint?: string; error?: string; style?: StyleProp<ViewStyle> } & TextInputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = React.useState(false);
  return (
    <View style={[{ gap: 8 }, style]}>
      <T v="smallStrong">{label}</T>
      <TextInput
        placeholderTextColor={colors.ink3}
        {...input}
        onFocus={(e) => { setFocused(true); input.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); input.onBlur?.(e); }}
        accessibilityLabel={label}
        style={[
          s.input,
          { backgroundColor: colors.surface2, borderColor: error ? colors.danger : focused ? colors.lineStrong : colors.line, color: colors.ink },
          input.multiline && { height: 110, paddingTop: 14, textAlignVertical: 'top' },
        ]}
      />
      {error ? <T v="caption" tone="danger">{error}</T> : hint ? <T v="caption" tone="ink3">{hint}</T> : null}
    </View>
  );
}

/** Pills for picking one option. */
export function Segmented<V extends string>({ value, onChange, items }: { value: V; onChange: (v: V) => void; items: { value: V; label: string }[] }) {
  const { colors } = useTheme();
  return (
    <View style={[s.segmented, { backgroundColor: colors.surface2, borderColor: colors.line }]} accessibilityRole="tablist">
      {items.map((it) => {
        const on = it.value === value;
        return (
          <Pressable
            key={it.value}
            onPress={() => onChange(it.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[s.segment, on && { backgroundColor: colors.primary }]}
          >
            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: on ? colors.onPrimary : colors.ink2 }}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Wrapping pills for picking one of several options. */
export function Choices<V extends string>({ value, onChange, items, label }: { value: V; onChange: (v: V) => void; items: { value: V; label: string }[]; label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {label ? <T v="smallStrong">{label}</T> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup">
        {items.map((it) => {
          const on = it.value === value;
          return (
            <Pressable
              key={it.value}
              onPress={() => onChange(it.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              style={{ paddingHorizontal: 16, height: 40, borderRadius: 999, justifyContent: 'center', borderWidth: 1, borderColor: on ? colors.primary : colors.line, backgroundColor: on ? colors.primary : colors.surface }}
            >
              <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: on ? colors.onPrimary : colors.ink2 }}>{it.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function useInsetsBottom() {
  return useSafeAreaInsets().bottom;
}

const s = StyleSheet.create({
  header: { paddingTop: 8, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  panel: { borderRadius: 24, padding: 18, borderWidth: 1 },
  sectionTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 28, marginBottom: 12 },
  btn: { borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  chip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  rowIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  notice: { borderRadius: 18, paddingHorizontal: 16, paddingVertical: 13 },
  input: { height: 52, borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, fontFamily: fonts.body, fontSize: 16 },
  segmented: { flexDirection: 'row', padding: 4, borderRadius: 999, borderWidth: 1 },
  segment: { flex: 1, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
