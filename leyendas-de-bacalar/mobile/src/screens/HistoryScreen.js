import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme.js';
import { getScanHistory, clearScanHistory } from '../lib/scanHistory.js';
import { openFloorAr } from '../lib/sceneViewer.js';

// "Modelos escaneados": lista local para volver a ver un modelo sin re-escanear.
export default function HistoryScreen({ onOpenSidebar }) {
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    setItems(await getScanHistory());
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleClear() {
    await clearScanHistory();
    load();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onOpenSidebar} hitSlop={12} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>☰</Text>
        </Pressable>
        <Text style={styles.title}>Modelos escaneados</Text>
        {items.length > 0 ? (
          <Pressable onPress={handleClear} hitSlop={12}><Text style={styles.clear}>Limpiar</Text></Pressable>
        ) : <View style={{ width: 52 }} />}
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🗿</Text>
          <Text style={styles.emptyText}>Aún no has escaneado modelos.</Text>
          <Text style={styles.emptyHint}>Escanea un marcador y aparecerán aquí para verlos cuando quieras.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.thumb}><Text style={styles.thumbIcon}>◈</Text></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                {!!item.legendTitle && <Text style={styles.cardLegend} numberOfLines={1}>{item.legendTitle}</Text>}
              </View>
              <Pressable style={styles.arBtn} onPress={() => openFloorAr(item.modelUrl, item.name)}>
                <Text style={styles.arBtnText}>Ver en AR</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  menuBtn: { width: 52 },
  menuIcon: { color: colors.text, fontSize: 24 },
  title: { color: colors.text, fontSize: 18, fontWeight: '700' },
  clear: { color: colors.cyan, fontSize: 14, width: 52, textAlign: 'right' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: colors.text, fontSize: 17, fontWeight: '600' },
  emptyHint: { color: colors.faint, fontSize: 13, textAlign: 'center', maxWidth: 260 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
  },
  thumb: {
    width: 46, height: 46, borderRadius: 12, backgroundColor: 'rgba(48,207,242,0.16)',
    alignItems: 'center', justifyContent: 'center',
  },
  thumbIcon: { color: colors.cyan, fontSize: 22 },
  cardName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  cardLegend: { color: colors.faint, fontSize: 12 },
  arBtn: { backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 14 },
  arBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
