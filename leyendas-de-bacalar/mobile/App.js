import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './src/lib/supabase.js';
import { ThemeProvider, useTheme } from './src/theme.js';
import SplashScreen from './src/screens/SplashScreen.js';
import ScanScreen from './src/screens/ScanScreen.js';
import LoginScreen from './src/screens/LoginScreen.js';
import HistoryScreen from './src/screens/HistoryScreen.js';
import Sidebar from './src/components/Sidebar.js';

function Root() {
  const { colors, mode } = useTheme();
  const [session, setSession] = useState(null);
  const [guest, setGuest] = useState(false); // "Continuar como invitado": escanear sin cuenta
  const [screen, setScreen] = useState('splash'); // splash | scan | login | history
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  // Recuerda el modo invitado: si ya entró como invitado antes, no vuelve a mostrar la
  // puerta de acceso en cada apertura de la app.
  useEffect(() => {
    AsyncStorage.getItem('leyendas.ar.guest').then((v) => { if (v === '1') setGuest(true); }).catch(() => {});
  }, []);

  const continueAsGuest = () => {
    setGuest(true);
    AsyncStorage.setItem('leyendas.ar.guest', '1').catch(() => {});
    setScreen('scan');
  };

  async function logout() {
    try { await supabase.auth.signOut(); } catch { /* sesión ya cerrada */ }
    setScreen('scan');
  }

  function renderScreen() {
    switch (screen) {
      case 'splash':
        return <SplashScreen onDone={() => setScreen('scan')} />;
      case 'login':
        return (
          <LoginScreen
            onClose={() => setScreen('scan')}
            onLoggedIn={() => { setGuest(false); setScreen('scan'); }}
            onGuest={continueAsGuest}
          />
        );
      case 'history':
        return <HistoryScreen session={session} onOpenSidebar={() => setSidebarOpen(true)} />;
      case 'scan':
      default:
        return (
          <ScanScreen
            session={session}
            guest={guest}
            onOpenSidebar={() => setSidebarOpen(true)}
            onRequireLogin={() => setScreen('login')}
            onContinueGuest={continueAsGuest}
          />
        );
    }
  }

  const showSidebar = screen !== 'splash' && screen !== 'login';

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} translucent backgroundColor="transparent" />
      {renderScreen()}
      {showSidebar && (
        <Sidebar
          visible={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          current={screen}
          onNavigate={setScreen}
          session={session}
          onLogout={logout}
        />
      )}
    </View>
  );
}

export default function App() {
  // Bebas Neue para títulos (mismo espíritu que el landing intro de la web).
  useFonts({ BebasNeue: require('./assets/fonts/BebasNeue-Regular.ttf') });
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Root />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
