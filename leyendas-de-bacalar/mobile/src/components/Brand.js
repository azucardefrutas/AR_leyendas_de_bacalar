import React from 'react';
import { Text, Pressable, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme.js';

// Título en Bebas Neue (se carga en App.js con useFonts).
export function BrandText({ children, size = 32, color, style, spacing = 1.5 }) {
  const { colors } = useTheme();
  return (
    <Text style={[{ fontFamily: 'BebasNeue', fontSize: size, letterSpacing: spacing, color: color || colors.text }, style]}>
      {children}
    </Text>
  );
}

// Botón "clay" con gradiente + sombra suave (claymorfismo).
export function GradientButton({ label, onPress, gradient, textColor = '#fff', style, height = 50, disabled }) {
  const { colors } = useTheme();
  const g = gradient || colors.primaryGrad;
  return (
    <Pressable onPress={disabled ? undefined : onPress} style={({ pressed }) => [
      styles.clayShadow,
      { borderRadius: 18, opacity: disabled ? 0.6 : 1, transform: [{ scale: pressed ? 0.975 : 1 }] },
      style,
    ]}>
      <LinearGradient colors={g} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.btn, { height }]}>
        <Text style={[styles.btnText, { color: textColor }]}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

// Tarjeta glass (blur real + tinte del tema).
export function GlassCard({ children, style, intensity = 36, radius = 24 }) {
  const { mode, colors } = useTheme();
  return (
    <View style={[styles.glass, { borderRadius: radius, borderColor: colors.cardBrd }, style]}>
      <BlurView intensity={intensity} tint={mode === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card, borderRadius: radius }]} />
      <View style={{ position: 'relative' }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
  btnText: { fontWeight: '800', letterSpacing: 1, fontSize: 15 },
  clayShadow: {
    shadowColor: '#00343B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 14, elevation: 8,
  },
  glass: { overflow: 'hidden', borderWidth: 1 },
});
