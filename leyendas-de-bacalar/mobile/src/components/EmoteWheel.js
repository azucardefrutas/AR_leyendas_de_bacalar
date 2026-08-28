import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { getEmoteWheelPage } from '../lib/emoteWheelLayout.js';

export default function EmoteWheel({ clips = [], selectedClip, title, visible, onSelect, onClose }) {
  const [page, setPage] = useState(0);
  const { width } = useWindowDimensions();
  const size = Math.min(340, width - 24);
  const layout = getEmoteWheelPage(clips, page, size);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.backdrop}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Emotes</Text>
          <Text style={styles.modelName}>{title}</Text>
          <View style={[styles.wheel, { width: size, height: size }]}>
            {layout.items.map(({ clip, ...position }) => (
              <Pressable key={clip} accessibilityRole="button" accessibilityLabel={`Reproducir ${clip}`}
                accessibilityState={{ selected: selectedClip === clip }}
                style={[styles.emote, position, selectedClip === clip && styles.selected]}
                onPress={() => { onSelect(clip); onClose(); }}>
                <MaterialIcons name="play-arrow" size={23} color="#fff" />
                <Text style={styles.label} numberOfLines={2}>{clip}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.close} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar emotes">
              <MaterialIcons name="close" size={26} color="#fff" />
            </Pressable>
          </View>
          {layout.pageCount > 1 && (
            <View style={styles.pagination}>
              <Pressable style={styles.pageButton} disabled={layout.pageIndex === 0} onPress={() => setPage(layout.pageIndex - 1)} accessibilityLabel="Emotes anteriores">
                <MaterialIcons name="chevron-left" size={28} color={layout.pageIndex === 0 ? '#657780' : '#fff'} />
              </Pressable>
              <Text style={styles.label}>{layout.pageIndex + 1} / {layout.pageCount}</Text>
              <Pressable style={styles.pageButton} disabled={layout.pageIndex === layout.pageCount - 1} onPress={() => setPage(layout.pageIndex + 1)} accessibilityLabel="Emotes siguientes">
                <MaterialIcons name="chevron-right" size={28} color={layout.pageIndex === layout.pageCount - 1 ? '#657780' : '#fff'} />
              </Pressable>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(5,18,24,0.84)' },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 12 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800' },
  modelName: { color: '#c8dce4', fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
  wheel: { position: 'relative', borderRadius: 200, borderWidth: 1, borderColor: '#68838f', backgroundColor: 'rgba(255,255,255,0.04)' },
  emote: { position: 'absolute', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderRadius: 8, borderWidth: 1, borderColor: '#637d89', backgroundColor: '#294955' },
  selected: { backgroundColor: '#087f8c', borderColor: '#77e4e8', borderWidth: 2 },
  label: { color: '#fff', fontSize: 12, lineHeight: 15, fontWeight: '700', textAlign: 'center' },
  close: { position: 'absolute', top: '50%', left: '50%', marginLeft: -26, marginTop: -26, width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#18333e', borderWidth: 1, borderColor: '#88a5b2' },
  pagination: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  pageButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
