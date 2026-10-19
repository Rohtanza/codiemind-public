import { useEffect, useState } from 'react';
import { Appearance, ColorSchemeName, View } from 'react-native';

export function Screen({ children }: { children: React.ReactNode }) {
  const [scheme, setScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => setScheme(colorScheme));
    return () => sub.remove();
  }, []);

  return <View style={{ flex: 1, backgroundColor: scheme === 'dark' ? '#000' : '#fff' }}>{children}</View>;
}
