import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '../theme.js';

const logo = require('../../assets/logo-upb.png');

// Intro tipo landing de la web (sin las imágenes de modelos): logo UPB + título.
export default function SplashScreen({ onDone }) {
  useEffect(() => {
    const t = setTimeout(() => { if (onDone) onDone(); }, 2400);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <View style={styles.container}>
      <View style={[styles.glow, styles.glowTop]} />
      <View style={[styles.glow, styles.glowBottom]} />
      <View style={styles.center}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Leyendas de Bacalar</Text>
        <Text style={styles.subtitle}>Realidad Aumentada</Text>
      </View>
      <Text style={styles.footer}>Universidad Politécnica de Bacalar</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  glow: { position: 'absolute', width: 360, height: 360, borderRadius: 360, opacity: 0.22 },
  glowTop: { top: -120, right: -100, backgroundColor: colors.cyan },
  glowBottom: { bottom: -140, left: -110, backgroundColor: colors.teal },
  center: { alignItems: 'center', gap: 12, paddingHorizontal: 24 },
  logo: { width: 130, height: 130, marginBottom: 6 },
  title: { color: colors.text, fontSize: 30, fontWeight: '800', textAlign: 'center', letterSpacing: 0.5 },
  subtitle: {
    color: colors.cyan, fontSize: 14, fontWeight: '600', letterSpacing: 3,
    textTransform: 'uppercase',
  },
  footer: { position: 'absolute', bottom: 34, color: colors.faint, fontSize: 12 },
});
