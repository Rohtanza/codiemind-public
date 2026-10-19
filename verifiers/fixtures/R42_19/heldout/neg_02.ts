import { Appearance, useColorScheme } from 'react-native';

const palette = {
  light: { text: '#11181C', background: '#fff' },
  dark: { text: '#ECEDEE', background: '#151718' },
};

export function useThemeColor(name: keyof typeof palette.light): string {
  const scheme = useColorScheme() ?? 'light';
  return palette[scheme][name];
}

export function staticThemeColor(name: keyof typeof palette.light): string {
  const scheme = Appearance.getColorScheme() ?? 'light';
  return palette[scheme][name];
}
