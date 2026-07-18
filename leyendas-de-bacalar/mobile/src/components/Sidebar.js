import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Pressable, StyleSheet, Animated, Dimensions, BackHandler } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme.js';
import { BrandText } from './Brand.js';

const logo = require('../../assets/logo-upb.png');
const WIDTH = Math.min(312, Dimensions.get('window').width * 0.84);

function Item({ icon, label, active, onPress, colors }) {
  return (
    <Pressable
      style={[styles.item, active && { backgroundColor: 'rgba(109,189,230,0.18)' }]}
      onPress={onPress}
    >
      <MaterialIcons name={icon} size={22} color={active ? colors.primary : colors.muted} />
      <Text style={[styles.itemLabel, { color: active ? colors.text : colors.muted }, active && { fontWeight: '700' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function Sidebar({ visible, onClose, current, onNavigate, session, onLogout }) {
  const { colors, mode, toggle } = useTheme();
  const tx = useRef(new Animated.Value(-WIDTH)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(tx, { toValue: visible ? 0 : -WIDTH, duration: 240, useNativeDriver: true }),
      Animated.timing(fade, { toValue: visible ? 1 : 0, duration: 240, useNativeDriver: true }),
    ]).start();
  }, [visible, tx, fade]);

  // El botón físico "atrás" de Android cierra el menú (antes se quedaba abierto).
  useEffect(() => {
    if (!visible) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    return () => sub.remove();
  }, [visible, onClose]);

  const go = (screen) => { onClose(); onNavigate(screen); };

  // Logo + banda del encabezado se adaptan al tema (oscuro=blanco, claro=azul UPB).
  const headerBg = mode === 'dark' ? '#00626F' : '#DBF2F5';
  const brandColor = mode === 'dark' ? '#FFFFFF' : colors.teal800;
  const subColor = mode === 'dark' ? colors.pale : colors.teal700;
  const logoTint = mode === 'dark' ? '#FFFFFF' : undefined;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Cerrar menú" />
      </Animated.View>

      <Animated.View style={[styles.panel, { width: WIDTH, backgroundColor: colors.surfaceSolid, transform: [{ translateX: tx }] }]}>
        <View style={[styles.header, { backgroundColor: headerBg }]}>
          <Image source={logo} style={[styles.logo, logoTint && { tintColor: logoTint }]} resizeMode="contain" />
          <View>
            <BrandText size={22} color={brandColor} spacing={1.5}>LEYENDAS AR</BrandText>
            <Text style={[styles.brandSub, { color: subColor }]}>BACALAR</Text>
          </View>
        </View>

        <View style={styles.nav}>
          <Item icon="photo-camera" label="Abrir cámara (escanear)" active={current === 'scan'} onPress={() => go('scan')} colors={colors} />
          <Item icon="view-in-ar" label="Modelos escaneados" active={current === 'history'} onPress={() => go('history')} colors={colors} />
        </View>

        <View style={[styles.foot, { borderTopColor: colors.line }]}>
          {session ? (
            <>
              <View style={styles.userRow}>
                <MaterialIcons name="account-circle" size={22} color={colors.primary} />
                <Text style={[styles.userEmail, { color: colors.text }]} numberOfLines={1}>{session.user?.email || 'Mi cuenta'}</Text>
              </View>
              <Item icon="logout" label="Cerrar sesión" onPress={() => { onClose(); onLogout(); }} colors={colors} />
            </>
          ) : (
            <Item icon="login" label="Iniciar sesión" active={current === 'login'} onPress={() => go('login')} colors={colors} />
          )}

          <Pressable onPress={toggle} style={[styles.themeRow, { backgroundColor: colors.surface, borderColor: colors.line }]}>
            <View style={styles.themeLeft}>
              <MaterialIcons name={mode === 'dark' ? 'dark-mode' : 'light-mode'} size={20} color={colors.primary} />
              <Text style={{ color: colors.text, fontSize: 13.5 }}>{mode === 'dark' ? 'Tema oscuro' : 'Tema claro'}</Text>
            </View>
            <View style={[styles.toggle, { backgroundColor: colors.primary }]}>
              <View style={[styles.knob, mode === 'dark' && styles.knobOn]} />
            </View>
          </Pressable>

          <Text style={[styles.version, { color: colors.faint }]}>Leyendas de Bacalar · v1.1</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,34,39,0.42)' },
  panel: { position: 'absolute', top: 0, bottom: 0, left: 0, overflow: 'hidden' },
  header: { paddingTop: 52, paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 46, height: 46 },
  brandSub: { fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginTop: -2 },
  nav: { flex: 1, paddingTop: 12, paddingHorizontal: 12, gap: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 12, borderRadius: 14 },
  itemLabel: { fontSize: 15, fontWeight: '500' },
  foot: { borderTopWidth: 1, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 22, gap: 8 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 6 },
  userEmail: { fontSize: 13, flex: 1 },
  themeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginTop: 4 },
  themeLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggle: { width: 50, height: 28, borderRadius: 999, justifyContent: 'center' },
  knob: { width: 22, height: 22, borderRadius: 999, backgroundColor: '#fff', position: 'absolute', left: 3 },
  knobOn: { left: 25 },
  version: { fontSize: 11, textAlign: 'center', marginTop: 6 },
});
