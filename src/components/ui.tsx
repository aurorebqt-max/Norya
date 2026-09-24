import React, { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  ViewStyle,
  TextStyle,
  StyleProp,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, Href } from "expo-router";
import { colors as c, shadow } from "../design/theme";
export type IconName = React.ComponentProps<typeof Ionicons>["name"];
export function Icon({
  name,
  size = 22,
  color = c.ink,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}
export function Txt({
  children,
  size = 15,
  color = c.ink,
  bold = false,
  style,
}: {
  children: React.ReactNode;
  size?: number;
  color?: string;
  bold?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text
      style={[
        {
          fontSize: size,
          color,
          fontWeight: bold ? "600" : "400",
          lineHeight: size * 1.5,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Button({
  title,
  onPress,
  secondary = false,
  icon,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  icon?: IconName;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor: secondary ? c.mint : c.primary,
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
        },
      ]}
    >
      <Txt
        bold
        color={secondary ? c.primary : "#fff"}
        style={{ flexShrink: 1, textAlign: "center" }}
      >
        {title}
      </Txt>
      {icon && (
        <Icon name={icon} size={18} color={secondary ? c.primary : "#fff"} />
      )}
    </Pressable>
  );
}
export function Chip({
  label,
  selected = false,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        s.chip,
        {
          backgroundColor: selected ? c.primary : c.paper,
          borderColor: selected ? c.primary : c.line,
        },
      ]}
    >
      <Txt size={13} color={selected ? "white" : c.muted}>
        {label}
      </Txt>
    </Pressable>
  );
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[s.card, style]}>{children}</View>;
}
export function Progress({
  value,
  color = c.primary,
}: {
  value: number;
  color?: string;
}) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: value }}
      style={{
        height: 6,
        backgroundColor: c.line,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          height: 6,
          width: `${value}%`,
          backgroundColor: color,
          borderRadius: 8,
        }}
      />
    </View>
  );
}
export function Section({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={s.between}>
      <Txt size={20} bold>
        {title}
      </Txt>
      {action && (
        <Pressable accessibilityRole="button" onPress={onPress}>
          <Txt size={13} color={c.primary} bold>
            {action} →
          </Txt>
        </Pressable>
      )}
    </View>
  );
}
export function RowLink({
  title,
  subtitle,
  icon = "arrow-forward-outline",
  href,
  onPress,
  color = c.mint,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  href?: Href;
  onPress?: () => void;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress ?? (() => href && router.push(href))}
      style={({ pressed }) => [s.link, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[s.iconBox, { backgroundColor: color }]}>
        <Icon name={icon} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Txt bold>{title}</Txt>
        {subtitle && (
          <Txt size={12} color={c.muted}>
            {subtitle}
          </Txt>
        )}
      </View>
      <Icon name="chevron-forward" size={18} color={c.muted} />
    </Pressable>
  );
}
export function Screen({
  children,
  title,
  subtitle,
  back = false,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  back?: boolean;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [opacity]);
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
    >
      <Animated.View
        style={{
          width: "100%",
          maxWidth: 1120,
          alignSelf: "center",
          gap: 24,
          opacity,
        }}
      >
        {back && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retour"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/")
            }
          >
            <Icon name="arrow-back" />
          </Pressable>
        )}
        <View>
          <Txt size={30} bold style={{ letterSpacing: -1 }}>
            {title}
          </Txt>
          {subtitle && (
            <Txt color={c.muted} style={{ marginTop: 5 }}>
              {subtitle}
            </Txt>
          )}
        </View>
        {children}
      </Animated.View>
    </ScrollView>
  );
}
export function Columns({
  main,
  side,
}: {
  main: React.ReactNode;
  side: React.ReactNode;
}) {
  const wide = useWindowDimensions().width > 1000;
  return (
    <View style={{ flexDirection: wide ? "row" : "column", gap: 24 }}>
      <View style={{ flex: wide ? 1.85 : undefined, gap: 24 }}>{main}</View>
      <View style={{ flex: wide ? 1 : undefined, gap: 24 }}>{side}</View>
    </View>
  );
}
export const s = StyleSheet.create({
  card: {
    backgroundColor: c.paper,
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: c.line,
    gap: 16,
    ...shadow,
  },
  between: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  button: {
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
  },
  input: {
    backgroundColor: c.paper,
    borderColor: c.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: 15,
    fontSize: 16,
    color: c.ink,
    minHeight: 50,
  },
  label: {
    fontSize: 12,
    color: c.muted,
    letterSpacing: 1.4,
    fontWeight: "600",
  },
});
