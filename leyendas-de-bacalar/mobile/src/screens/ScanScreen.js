import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ActivityIndicator, FlatList } from 'react-native';
import { ViroARSceneNavigator } from '@reactvision/react-viro';
import { useCameraPermissions } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';
import * as Network from 'expo-network';
import ArScene from './ArScene.js';
import { useTheme } from '../theme.js';
import { BrandText } from '../components/Brand.js';
import { fetchArScenes } from '../lib/arScenes.js';
import { recordScan, getScanHistory } from '../lib/scanHistory.js';
import { openFloorAr } from '../lib/sceneViewer.js';

export default function ScanScreen({ session, onOpenSidebar, onRequireLogin }) {
  const { colors } = useTheme();
  const uid = session?.user?.id;
  const navRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [offline, setOffline] = useState(false);
  const [scanned, setScanned] = useState([]); // colección local del lector (por cuenta)
  const toastTimer = useRef(null);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [permission, requestPermission]);

  useEffect(() => {
    if (!session) { setLoading(false); return undefined; }
    let cancelled = false;
    setLoading(true); setLoadError('');
    (async () => {
      try {
        const list = await fetchArScenes();
        if (!cancelled) setScenes(list);
      } catch {
        if (!cancelled) setLoadError('No se pudieron cargar los marcadores.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [session]);

  // Colección local del lector: SOLO los modelos que ÉL escaneó, separada por cuenta.
  useEffect(() => {
    let active = true;
    getScanHistory(uid).then((h) => { if (active) setScanned(h); });
    return () => { active = false; };
  }, [uid]);

  const showToast = useCallback((m) => {
    setToast(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Aviso de sin conexión (los modelos GLB se descargan por internet).
  useEffect(() => {
    let active = true;
    Network.getNetworkStateAsync()
      .then((s) => { if (active) setOffline(!s.isConnected); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  async function saveToGallery(uri) {
    try {
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) return false;
      await MediaLibrary.saveToLibraryAsync(uri);
      return true;
    } catch { return false; }
  }

  const onFound = useCallback((scene) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    // Guarda el modelo en la colección de ESTA cuenta y refresca la lista al vuelo.
    recordScan(uid, scene).then(setScanned).catch(() => {});
    showToast(`Escaneado: ${scene.name || 'modelo'}`);
  }, [uid, showToast]);

  const viroAppProps = useMemo(() => ({ scenes, onFound }), [scenes, onFound]);

  async function capture() {
    try {
      const result = await navRef.current?.takeScreenshot?.('leyendas-ar', false);
      const path = result?.url;
      if (!path) { showToast('No se pudo capturar.'); return; }
      const uri = path.startsWith('file') ? path : `file://${path}`;
      const saved = await saveToGallery(uri);
      if (saved) { showToast('Foto guardada en la galería.'); }
      else if (await Sharing.isAvailableAsync()) { await Sharing.shareAsync(uri); }
      else { showToast('Foto lista.'); }
    } catch { showToast('No se pudo capturar.'); }
  }

  async function toggleRecord() {
    const nav = navRef.current;
    if (!nav) return;
    if (!recording) {
      try {
        await nav.startVideoRecording?.('leyendas-ar-video', false, () => { setRecording(false); showToast('No se pudo grabar.'); });
        setRecording(true);
        showToast('Grabando…');
      } catch { showToast('Grabación no disponible.'); }
    } else {
      try {
        const res = await nav.stopVideoRecording?.();
        setRecording(false);
        const path = res?.url;
        if (!path) { showToast('Video guardado.'); return; }
        const uri = path.startsWith('file') ? path : `file://${path}`;
        const saved = await saveToGallery(uri);
        if (saved) { showToast('Video guardado en la galería.'); }
        else if (await Sharing.isAvailableAsync()) { await Sharing.shareAsync(uri); }
        else { showToast('Video listo.'); }
      } catch { setRecording(false); showToast('No se pudo detener.'); }
    }
  }

  if (!session) {
    return <Gate colors={colors} onOpenSidebar={onOpenSidebar} icon="login" title="Inicia sesión para escanear"
      text="Con tu cuenta cargamos los marcadores y modelos de tus leyendas." cta="Iniciar sesión" onCta={onRequireLogin} />;
  }
  if (permission && !permission.granted) {
    return <Gate colors={colors} onOpenSidebar={onOpenSidebar} icon="photo-camera" title="Permiso de cámara"
      text="La app necesita la cámara para escanear los marcadores." cta="Permitir cámara" onCta={requestPermission} />;
  }
  if (loading) {
    return <View style={[styles.centerFill, { backgroundColor: colors.bg }]}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  // La cámara AR se muestra SIEMPRE (con sesión + permiso), aun sin marcadores
  // publicados. Si no hay, se avisa encima pero la cámara sigue viva.
  const hasScenes = scenes.length > 0;

  return (
    <View style={styles.container}>
      <ViroARSceneNavigator ref={navRef} autofocus initialScene={{ scene: ArScene }} viroAppProps={viroAppProps} style={styles.viro} />

      <View style={styles.topBar} pointerEvents="box-none">
        <IconBtn icon="menu" onPress={onOpenSidebar} colors={colors} />
        <View style={styles.hintWrap}>
          <Text style={styles.hintText}>{offline ? 'Sin conexión a internet' : 'Apunta al marcador del libro'}</Text>
        </View>
        {offline
          ? <View style={styles.iconBtn}><MaterialIcons name="wifi-off" size={22} color="#F2C14E" /></View>
          : <View style={{ width: 44 }} />}
      </View>

      {!hasScenes && (
        <View style={styles.noMarkers} pointerEvents="none">
          <View style={styles.noMarkersCard}>
            <MaterialIcons name={loadError ? 'wifi-off' : 'qr-code-2'} size={40} color="#EAF9FB" />
            <Text style={styles.noMarkersTitle}>{loadError ? 'Sin conexión' : 'Aún no hay marcadores'}</Text>
            <Text style={styles.noMarkersText}>
              {loadError
                ? 'Revisa tu internet para cargar tus marcadores.'
                : 'Publica un par marcador ↔ modelo desde la web y aparecerá aquí para escanear.'}
            </Text>
          </View>
        </View>
      )}

      {recording && (
        <View style={styles.recBadge}><View style={styles.recDot} /><Text style={styles.recTxt}>REC</Text></View>
      )}

      <View style={styles.dock} pointerEvents="box-none">
        <ActionBtn icon={recording ? 'stop' : 'videocam'} label={recording ? 'Detener' : 'Grabar'} onPress={toggleRecord} colors={colors} danger={recording} />
        <Shutter onPress={capture} colors={colors} />
        {scanned.length > 0
          ? <ActionBtn icon="view-in-ar" label="Mis modelos" onPress={() => setPickerOpen(true)} colors={colors} />
          : <View style={{ width: 78 }} />}
      </View>

      {!!toast && <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View>}

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setPickerOpen(false)} />
        <View style={[styles.sheet, { backgroundColor: colors.surfaceSolid }]}>
          <BrandText size={20} color={colors.text} style={{ marginBottom: 14 }}>VER UN MODELO EN EL PISO</BrandText>
          <FlatList
            data={scanned}
            keyExtractor={(s) => String(s.id)}
            contentContainerStyle={{ gap: 10, paddingBottom: 8 }}
            renderItem={({ item, index }) => (
              <Pressable style={[styles.sheetItem, { backgroundColor: colors.surface, borderColor: colors.line }]}
                onPress={() => { setPickerOpen(false); openFloorAr(item.modelUrl, item.name); }}>
                <View style={[styles.sheetIdx, { backgroundColor: colors.primary }]}><Text style={styles.sheetIdxT}>{index + 1}</Text></View>
                <Text style={[styles.sheetItemT, { color: colors.text }]} numberOfLines={1}>{item.name || `Modelo ${index + 1}`}</Text>
                <MaterialIcons name="view-in-ar" size={22} color={colors.primary} />
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

function IconBtn({ icon, onPress, colors, active }) {
  return (
    <Pressable style={[styles.iconBtn, active && { backgroundColor: colors.primary }]} onPress={onPress} hitSlop={10}>
      <MaterialIcons name={icon} size={23} color={active ? '#fff' : '#EAF9FB'} />
    </Pressable>
  );
}

function ActionBtn({ icon, label, onPress, colors, danger }) {
  return (
    <Pressable style={styles.act} onPress={onPress}>
      <View style={[styles.actIc, danger && { backgroundColor: '#E24B4A' }]}>
        <MaterialIcons name={icon} size={24} color={danger ? '#fff' : '#EAF9FB'} />
      </View>
      <Text style={styles.actLabel}>{label}</Text>
    </Pressable>
  );
}

function Shutter({ onPress, colors }) {
  return (
    <Pressable style={styles.act} onPress={onPress}>
      <LinearGradient colors={colors.primaryGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.shutter}>
        <MaterialIcons name="photo-camera" size={26} color="#fff" />
      </LinearGradient>
      <Text style={styles.actLabel}>Foto</Text>
    </Pressable>
  );
}

function Gate({ colors, onOpenSidebar, icon, title, text, cta, onCta }) {
  return (
    <View style={[styles.gate, { backgroundColor: colors.bg }]}>
      <View style={styles.topBar} pointerEvents="box-none">
        <IconBtn icon="menu" onPress={onOpenSidebar} colors={colors} />
      </View>
      <View style={styles.gateBody}>
        <MaterialIcons name={icon} size={56} color={colors.primary} />
        <Text style={[styles.gateTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.gateText, { color: colors.muted }]}>{text}</Text>
        {cta ? (
          <Pressable onPress={onCta}>
            <LinearGradient colors={colors.primaryGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gateBtn}>
              <Text style={styles.gateBtnT}>{cta}</Text>
            </LinearGradient>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  viro: { flex: 1 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noMarkers: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 32 },
  noMarkersCard: { alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,52,59,0.62)', borderRadius: 20, padding: 22, maxWidth: 300 },
  noMarkersTitle: { color: '#EAF9FB', fontSize: 17, fontWeight: '700' },
  noMarkersText: { color: 'rgba(234,249,251,0.82)', fontSize: 13.5, textAlign: 'center', lineHeight: 19 },
  topBar: { position: 'absolute', top: 46, left: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  hintWrap: { flex: 1, alignItems: 'center' },
  hintText: { color: '#fff', fontSize: 12.5, backgroundColor: 'rgba(0,52,59,0.5)', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, overflow: 'hidden' },
  iconBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,52,59,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  recBadge: { position: 'absolute', top: 96, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,52,59,0.6)', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999 },
  recDot: { width: 9, height: 9, borderRadius: 999, backgroundColor: '#E24B4A' },
  recTxt: { color: '#fff', fontWeight: '700', fontSize: 12, letterSpacing: 1 },
  dock: { position: 'absolute', left: 0, right: 0, bottom: 30, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 26 },
  act: { alignItems: 'center', gap: 5, width: 78 },
  actIc: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,52,59,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  actLabel: { color: '#fff', fontSize: 12, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 4 },
  shutter: { width: 66, height: 66, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)' },
  toast: { position: 'absolute', bottom: 128, alignSelf: 'center', backgroundColor: 'rgba(0,52,59,0.92)', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999 },
  toastText: { color: '#fff', fontSize: 14 },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34, maxHeight: '60%' },
  sheetItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1 },
  sheetIdx: { width: 28, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  sheetIdxT: { color: '#fff', fontWeight: '800' },
  sheetItemT: { fontSize: 15, flex: 1 },
  gate: { flex: 1 },
  gateBody: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  gateTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  gateText: { fontSize: 14, textAlign: 'center', maxWidth: 300 },
  gateBtn: { marginTop: 10, borderRadius: 16, paddingVertical: 13, paddingHorizontal: 30 },
  gateBtnT: { color: '#fff', fontWeight: '800', letterSpacing: 0.5 },
});
