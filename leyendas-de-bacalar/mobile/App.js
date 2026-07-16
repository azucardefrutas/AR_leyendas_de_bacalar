import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from './src/lib/supabase.js';
import SplashScreen from './src/screens/SplashScreen.js';
import ScanScreen from './src/screens/ScanScreen.js';
import LoginScreen from './src/screens/LoginScreen.js';
import HistoryScreen from './src/screens/HistoryScreen.js';
import Sidebar from './src/components/Sidebar.js';
import { colors } from './src/theme.js';

export default function App() {
  const [session, setSession] = useState(null);
  const [screen, setScreen] = useState('splash'); // splash | scan | login | history
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  async function logout() {
    try { await supabase.auth.signOut(); } catch { /* sesión ya cerrada */ }
    setScreen('scan');
  }

  function renderScreen() {
    switch (screen) {
      case 'splash':
        return <SplashScreen onDone={() => setScreen('scan')} />;
      case 'login':
        return <LoginScreen onClose={() => setScreen('scan')} onLoggedIn={() => setScreen('scan')} />;
      case 'history':
        return <HistoryScreen onOpenSidebar={() => setSidebarOpen(true)} />;
      case 'scan':
      default:
        return (
          <ScanScreen
            session={session}
            onOpenSidebar={() => setSidebarOpen(true)}
            onRequireLogin={() => setScreen('login')}
          />
        );
    }
  }

  const showSidebar = screen !== 'splash' && screen !== 'login';

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar style="light" translucent backgroundColor="transparent" />
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
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
