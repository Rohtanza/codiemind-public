import { Pressable, Text } from 'react-native';
import { useColorScheme } from 'nativewind';

export function ThemeToggle() {
  const { colorScheme, toggleColorScheme } = useColorScheme();
  return (
    <Pressable onPress={toggleColorScheme} className="p-4 bg-white dark:bg-black">
      <Text className="text-black dark:text-white">Theme: {colorScheme}</Text>
    </Pressable>
  );
}
