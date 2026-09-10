import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme.js';
import { BrandText } from '../components/Brand.js';
import { getScanHistory } from '../lib/scanHistory.js';
import { fetchArScenes } from '../lib/arScenes.js';
import { openFloorAr } from '../lib/sceneViewer.js';

// "Modelos escaneados" = galeria de los modelos de MUESTRA (catalogo publicado del feed) +
// lo que este dispositivo haya escaneado. Los de muestra se ven SIEMPRE (aunque no se hayan
// escaneado aun) para que el usuario sepa que modelos existen y pueda verlos en su espacio
// (Ver en AR de piso). Siguen siendo escaneables por su marcador desde la camara.
export default function HistoryScreen({ session, onOpenSidebar }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const uid = session?.user?.id;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    // 1) Catalogo de muestra (feed publico; funciona tambien para invitados).
    let catalog = [];
    try {
      const scenes = await fetchArScenes();
      catalog = (scenes || [])
        .filter((s) => s?.modelUrl)
        .map((s) => ({
          id: `catalog-${s.id}`,
          name: s.name || s.legend?.title || 'Modelo 3D',
          legendTitle: s.legend?.title || '',
          modelUrl: s.modelUrl,
          animated: (s.animationConfig?.clips?.length || 0) > 0,
        }));
    } catch {
      // Sin conexion al feed: mostramos solo lo escaneado localmente.
    }
    // 2) Lo que este dispositivo ya escaneo (por si algo no viene en el catalogo).
    const local = await getScanHistory(uid);
    const seen = new Set(catalog.map((c) => c.modelUrl));
    const extra = (local || [])
      .filter((l) => l?.modelUrl && !seen.has(l.modelUrl))
      .map((l) => ({
        id: String(l.id),
        name: l.name || 'Modelo 3D',
        legendTitle: l.legendTitle || '',
        modelUrl: l.modelUrl,
        animated: (l.animationConfig?.clips?.length || 0) > 0,
      }));
    setItems([...catalog, ...extra]);
    setLoading(false);
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={colors.bgGrad} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 14, borderBottomColor: colors.line }]}>
        <Pressable onPress={onOpenSidebar} hitSlop={12} style={styles.side}>
          <MaterialIcons name="menu" size={26} color={colors.text} />
        </Pressable>
        <BrandText size={22} color={colors.text} spacing={1}>MODELOS ESCANEADOS</BrandText>
        <View style={styles.side} />
      </View>

      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyH, { color: colors.muted }]}>Cargando modelos…</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="view-in-ar" size={56} color={colors.primary} />
          <Text style={[styles.emptyT, { color: colors.text }]}>Aún no hay modelos</Text>
          <Text style={[styles.emptyH, { color: colors.muted }]}>Conéctate a internet y vuelve a entrar, o escanea un marcador del libro.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 28 }}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
              <View style={[styles.thumb, { backgroundColor: 'rgba(109,189,230,0.2)' }]}>
                <MaterialIcons name={item.animated ? 'animation' : 'view-in-ar'} size={24} color={colors.primary} />
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
    paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1,
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
