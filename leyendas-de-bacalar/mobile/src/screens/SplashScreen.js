import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { BrandText } from '../components/Brand.js';

// Intro estilo landing web: fondo sólido #00626f + "LEYENDAS / BACALAR" en Bebas
// (sin partirse, sin imágenes), con entrada animada.
export default function SplashScreen({ onDone }) {
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(26)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 850, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => { if (onDone) onDone(); }, 2600);
    return () => clearTimeout(t);
  }, [onDone, fade, rise]);

  return (
    <View style={styles.container}>
      <View style={styles.glow} />
      <Animated.View style={[styles.center, { opacity: fade, transform: [{ translateY: rise }] }]}>
        <BrandText size={72} color="#FFFFFF" spacing={4} style={styles.word}>LEYENDAS</BrandText>
        <BrandText size={72} color="#FFFFFF" spacing={4} style={styles.word}>BACALAR</BrandText>
        <Text style={styles.sub}>REALIDAD AUMENTADA</Text>
      </Animated.View>
      <Text style={styles.foot}>Universidad Politécnica de Bacalar</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#00626F', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  glow: {
    position: 'absolute', width: 420, height: 420, borderRadius: 420, top: '18%',
    backgroundColor: '#A5F2F3', opacity: 0.12,
  },
  center: { alignItems: 'center' },
  word: { lineHeight: 66, textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 8 }, textShadowRadius: 24 },
  sub: { marginTop: 16, color: '#A5F2F3', fontSize: 11, letterSpacing: 6, fontWeight: '600' },
  foot: { position: 'absolute', bottom: 30, color: 'rgba(255,255,255,0.6)', fontSize: 11 },
});
