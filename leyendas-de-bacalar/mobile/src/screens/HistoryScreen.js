import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme.js';
import { BrandText } from '../components/Brand.js';
import { getScanHistory, clearScanHistory } from '../lib/scanHistory.js';
import { openFloorAr } from '../lib/sceneViewer.js';

export default function HistoryScreen({ onOpenSidebar }) {
  const { colors } = useTheme();
  const [items, setItems] = useState([]);

  const load = useCallback(async () => { setItems(await getScanHistory()); }, []);
  useEffect(() => { load(); }, [load]);

  async function handleClear() { await clearScanHistory(); load(); }

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={colors.bgGrad} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { borderBottomColor: colors.line }]}>
        <Pressable onPress={onOpenSidebar} hitSlop={12} style={styles.side}>
          <MaterialIcons name="menu" size={26} color={colors.text} />
        </Pressable>
        <BrandText size={22} color={colors.text} spacing={1}>MODELOS ESCANEADOS</BrandText>
        {items.length > 0 ? (
          <Pressable onPress={handleClear} hitSlop={12} style={styles.side}>
            <Text style={{ color: colors.primary, fontSize: 13, textAlign: 'right' }}>Limpiar</Text>
          </Pressable>
        ) : <View style={styles.side} />}
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="view-in-ar" size={56} color={colors.primary} />
          <Text style={[styles.emptyT, { color: colors.text }]}>Aún no has escaneado modelos</Text>
          <Text style={[styles.emptyH, { color: colors.muted }]}>Escanea un marcador y aparecerán aquí para verlos cuando quieras.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <View style={[styles.thumb, { backgroundColor: 'rgba(109,189,230,0.2)' }]}>
                <MaterialIcons name="view-in-ar" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                {!!item.legendTitle && <Text style={[styles.legend, { color: colors.faint }]} numberOfLines={1}>{item.legendTitle}</Text>}
              </View>
              <Pressable onPress={() => openFloorAr(item.modelUrl, item.name)}>
                <LinearGradient colors={colors.primaryGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.arBtn}>
                  <Text style={styles.arTxt}>Ver en AR</Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1,
  },
  side: { width: 44 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  emptyT: { fontSize: 17, fontWeight: '600' },
  emptyH: { fontSize: 13, textAlign: 'center', maxWidth: 260 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1 },
  thumb: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '600' },
  legend: { fontSize: 12 },
  arBtn: { borderRadius: 999, paddingVertical: 9, paddingHorizontal: 15 },
  arTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
