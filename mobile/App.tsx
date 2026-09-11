import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';

import { initMocks } from './src/api/msw';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export default function App() {
  const [fontsLoaded] = useFonts({
    // SF Pro (San Francisco Pro - Hevy App typography)
    'SF-Pro-Display-Regular': require('./assets/fonts/SF-Pro-Display-Regular.otf'),
    'SF-Pro-Display-Medium': require('./assets/fonts/SF-Pro-Display-Medium.otf'),
    'SF-Pro-Display-Semibold': require('./assets/fonts/SF-Pro-Display-Semibold.otf'),
    'SF-Pro-Display-Bold': require('./assets/fonts/SF-Pro-Display-Bold.otf'),
    'SF-Pro-Display-Black': require('./assets/fonts/SF-Pro-Display-Black.otf'),
    'SF-Pro-Text-Regular': require('./assets/fonts/SF-Pro-Text-Regular.otf'),

    // Aliases to ensure every existing component instantly renders in SF Pro
    Archivo_400Regular: require('./assets/fonts/SF-Pro-Display-Regular.otf'),
    Archivo_500Medium: require('./assets/fonts/SF-Pro-Display-Medium.otf'),
    Archivo_600SemiBold: require('./assets/fonts/SF-Pro-Display-Semibold.otf'),
    Archivo_700Bold: require('./assets/fonts/SF-Pro-Display-Bold.otf'),
    Archivo_800ExtraBold: require('./assets/fonts/SF-Pro-Display-Black.otf'),
    Archivo_900Black: require('./assets/fonts/SF-Pro-Display-Black.otf'),
    'Archivo-Bold': require('./assets/fonts/SF-Pro-Display-Bold.otf'),
    'Archivo-Black': require('./assets/fonts/SF-Pro-Display-Black.otf'),
  });

  useEffect(() => {
    initMocks();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Image
          source={require('./assets/gymflow-logo.png')}
          style={{ width: 80, height: 45, marginBottom: 12 }}
          resizeMode="contain"
        />
        <Image
          source={require('./assets/gymflow-text-dark.png')}
          style={{ width: 120, height: 40, marginBottom: 20 }}
          resizeMode="contain"
        />
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <RootNavigator />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
