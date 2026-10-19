import { Text, useColorScheme as useRNColorScheme } from 'react-native';

export function useColorScheme(): 'light' | 'dark' {
  return useRNColorScheme() ?? 'light';
}

export function Caption({ children }: { children: string }) {
  const scheme = useColorScheme();
  return <Text style={{ color: scheme === 'dark' ? '#ccc' : '#333' }}>{children}</Text>;
}
