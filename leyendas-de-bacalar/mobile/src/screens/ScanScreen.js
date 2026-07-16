import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Modal, ActivityIndicator, FlatList,
} from 'react-native';
import { ViroARSceneNavigator } from '@reactvision/react-viro';
import { useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import ArScene from './ArScene.js';
import { colors } from '../theme.js';
import { fetchArScenes } from '../lib/arScenes.js';
import { recordScan } from '../lib/scanHistory.js';
import { openFloorAr } from '../lib/sceneViewer.js';

export default function ScanScreen({ session, onOpenSidebar, onRequireLogin }) {
  const navRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
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

  const showToast = useCallback((m) => {
    setToast(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const onFound = useCallback((scene) => {
    recordScan(scene);
    showToast(`Escaneado: ${scene.name || 'modelo'}`);
  }, [showToast]);

  const viroAppProps = useMemo(() => ({ scenes, onFound }), [scenes, onFound]);

  async function capture() {
    try {
      const result = await navRef.current?.takeScreenshot?.('leyendas-ar', false);
      const path = result?.url;
      if (path && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(path.startsWith('file') ? path : `file://${path}`);
      } else {
        showToast('Captura guardada.');
      }
    } catch {
      showToast('No se pudo capturar.');
    }
  }

  if (!session) {
    return (
      <Gate onOpenSidebar={onOpenSidebar} icon="log-in-outline"
        title="Inicia sesión para escanear"
        text="Con tu cuenta cargamos los marcadores y modelos de tus leyendas."
        cta="Iniciar sesión" onCta={onRequireLogin} />
    );
  }
  if (permission && !permission.granted) {
    return (
      <Gate onOpenSidebar={onOpenSidebar} icon="camera-outline"
        title="Permiso de cámara"
        text="La app necesita la cámara para escanear los marcadores."
        cta="Permitir cámara" onCta={requestPermission} />
    );
  }
  if (loading) {
    return <View style={styles.centerFill}><ActivityIndicator color={colors.cyan} size="large" /></View>;
  }
  if (scenes.length === 0) {
    return (
      <Gate onOpenSidebar={onOpenSidebar} icon="cube-outline"
        title={loadError || 'Sin marcadores'}
        text={loadError ? 'Revisa tu conexión e intenta de nuevo.' : 'Tu cuenta todavía no tiene marcadores AR publicados.'} />
    );
  }

  return (
    <View style={styles.container}>
      <ViroARSceneNavigator
        ref={navRef}
        autofocus
        initialScene={{ scene: ArScene }}
        viroAppProps={viroAppProps}
        style={styles.viro}
      />

      <View style={styles.topBar} pointerEvents="box-none">
        <IconBtn icon="menu" onPress={onOpenSidebar} />
        <View style={styles.hint}><Text style={styles.hintText}>Apunta al marcador del libro</Text></View>
      </View>

      <View style={styles.bottomBar} pointerEvents="box-none">
        <ActionBtn icon="cube" label="Modelos 3D" onPress={() => setPickerOpen(true)} />
        <ActionBtn icon="camera" label="Capturar" primary onPress={capture} />
      </View>

      {!!toast && <View style={styles.toast}><Text style={styles.toastText}>{toast}</Text></View>}

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setPickerOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Ver un modelo en el piso (AR)</Text>
          <FlatList
            data={scenes}
            keyExtractor={(s) => String(s.id)}
            contentContainerStyle={{ gap: 10, paddingBottom: 8 }}
            renderItem={({ item, index }) => (
              <Pressable style={styles.sheetItem}
                onPress={() => { setPickerOpen(false); openFloorAr(item.modelUrl, item.name); }}>
                <View style={styles.sheetIdx}><Text style={styles.sheetIdxText}>{index + 1}</Text></View>
                <Text style={styles.sheetItemText} numberOfLines={1}>{item.name || `Modelo ${index + 1}`}</Text>
                <Ionicons name="cube-outline" size={22} color={colors.cyan} />
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

function IconBtn({ icon, onPress }) {
  return (
    <Pressable style={styles.iconBtn} onPress={onPress} hitSlop={10}>
      <Ionicons name={icon} size={24} color="#fff" />
    </Pressable>
  );
}

function ActionBtn({ icon, label, onPress, primary }) {
  return (
    <Pressable style={[styles.actionBtn, primary && styles.actionBtnPrimary]} onPress={onPress}>
      <Ionicons name={icon} size={24} color="#fff" />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function Gate({ onOpenSidebar, icon, title, text, cta, onCta }) {
  return (
    <View style={styles.gate}>
      <View style={styles.topBar} pointerEvents="box-none">
        <IconBtn icon="menu" onPress={onOpenSidebar} />
      </View>
      <View style={styles.gateBody}>
        <Ionicons name={icon} size={54} color={colors.cyan} />
        <Text style={styles.gateTitle}>{title}</Text>
        <Text style={styles.gateText}>{text}</Text>
        {cta ? <Pressable style={styles.gateBtn} onPress={onCta}><Text style={styles.gateBtnText}>{cta}</Text></Pressable> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  viro: { flex: 1 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  topBar: { position: 'absolute', top: 46, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  hint: { flex: 1, alignItems: 'center' },
  hintText: {
    color: '#fff', fontSize: 13, backgroundColor: 'rgba(3,12,20,0.5)',
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, overflow: 'hidden',
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(3,12,20,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 34, flexDirection: 'row', justifyContent: 'center', gap: 20 },
  actionBtn: {
    alignItems: 'center', justifyContent: 'center', gap: 4, width: 96, paddingVertical: 12, borderRadius: 18,
    backgroundColor: 'rgba(3,12,20,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
  },
  actionBtnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionLabel: { color: '#fff', fontSize: 12, fontWeight: '600' },
  toast: {
    position: 'absolute', bottom: 120, alignSelf: 'center', backgroundColor: 'rgba(3,12,20,0.9)',
    paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: colors.line,
  },
  toastText: { color: '#fff', fontSize: 14 },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: '#07202e', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, paddingBottom: 34, maxHeight: '60%' },
  sheetTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 14 },
  sheetItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line,
  },
  sheetIdx: { width: 28, height: 28, borderRadius: 999, backgroundColor: colors.cyan, alignItems: 'center', justifyContent: 'center' },
  sheetIdxText: { color: colors.bg, fontWeight: '800' },
  sheetItemText: { color: colors.text, fontSize: 15, flex: 1 },
  gate: { flex: 1, backgroundColor: colors.bg },
  gateBody: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  gateTitle: { color: colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  gateText: { color: colors.faint, fontSize: 14, textAlign: 'center', maxWidth: 300 },
  gateBtn: { marginTop: 10, backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 13, paddingHorizontal: 28 },
  gateBtnText: { color: '#fff', fontWeight: '800', letterSpacing: 0.5 },
});
