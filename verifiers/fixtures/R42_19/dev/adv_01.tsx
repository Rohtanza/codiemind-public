import { Text, View, useColorScheme as useNativeColorScheme } from 'react-native';
import { useColorScheme } from 'nativewind';

export type Scheme = ReturnType<typeof useNativeColorScheme>;

export default function SettingsHeader() {
  const { colorScheme } = useColorScheme();
  return (
    <View className="p-4 bg-white dark:bg-zinc-900">
      <Text className="text-lg dark:text-white">Appearance: {colorScheme}</Text>
    </View>
  );
}
