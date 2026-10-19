import * as RN from 'react-native';
import { StatusBar } from 'expo-status-bar';

export function ThemedStatusBar() {
  const scheme = RN.useColorScheme();
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}
