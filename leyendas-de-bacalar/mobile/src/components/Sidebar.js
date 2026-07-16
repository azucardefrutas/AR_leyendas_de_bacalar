import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Pressable, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme.js';

const logo = require('../../assets/logo-upb.png');
const WIDTH = Math.min(300, Dimensions.get('window').width * 0.82);

function Item({ icon, label, active, onPress }) {
  return (
    <Pressable style={[styles.item, active && styles.itemActive]} onPress={onPress}>
      <Ionicons name={icon} size={22} color={active ? colors.cyan : colors.muted} />
      <Text style={[styles.itemLabel, active && styles.itemLabelActive]}>{label}</Text>
    </Pressable>
  );
}

export default function Sidebar({ visible, onClose, current, onNavigate, session, onLogout }) {
  const tx = useRef(new Animated.Value(-WIDTH)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(tx, { toValue: visible ? 0 : -WIDTH, duration: 220, useNativeDriver: true }),
      Animated.timing(fade, { toValue: visible ? 1 : 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [visible, tx, fade]);

  const go = (screen) => { onClose(); onNavigate(screen); };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.panel, { width: WIDTH, transform: [{ translateX: tx }] }]}>
        <View style={styles.header}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
          <View>
            <Text style={styles.brand}>Leyendas AR</Text>
            <Text style={styles.brandSub}>Bacalar</Text>
          </View>
        </View>

        <View style={styles.items}>
          <Item icon="scan-outline" label="Escanear" active={current === 'scan'} onPress={() => go('scan')} />
          <Item icon="cube-outline" label="Modelos escaneados" active={current === 'history'} onPress={() => go('history')} />
        </View>

        <View style={styles.footer}>
          {session ? (
            <>
              <View style={styles.userRow}>
                <Ionicons name="person-circle-outline" size={22} color={colors.cyan} />
                <Text style={styles.userEmail} numberOfLines={1}>{session.user?.email || 'Mi cuenta'}</Text>
              </View>
              <Item icon="log-out-outline" label="Cerrar sesión" onPress={() => { onClose(); onLogout(); }} />
            </>
          ) : (
            <Item icon="log-in-outline" label="Iniciar sesión" active={current === 'login'} onPress={() => go('login')} />
          )}
          <Text style={styles.version}>Leyendas de Bacalar · v1.0</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  panel: {
    position: 'absolute', top: 0, bottom: 0, left: 0,
    backgroundColor: '#07202e', borderRightWidth: 1, borderRightColor: colors.line,
    paddingTop: 54, paddingHorizontal: 16, paddingBottom: 24,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: colors.line },
  logo: { width: 44, height: 44 },
  brand: { color: colors.text, fontSize: 18, fontWeight: '800' },
  brandSub: { color: colors.cyan, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' },
  items: { paddingTop: 14, gap: 4, flex: 1 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 10, borderRadius: 12 },
  itemActive: { backgroundColor: 'rgba(48,207,242,0.12)' },
  itemLabel: { color: colors.muted, fontSize: 16, fontWeight: '500' },
  itemLabelActive: { color: colors.text, fontWeight: '700' },
  footer: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12, gap: 4 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 8 },
  userEmail: { color: colors.text, fontSize: 13, flex: 1 },
  version: { color: colors.faint, fontSize: 11, textAlign: 'center', marginTop: 10 },
});
