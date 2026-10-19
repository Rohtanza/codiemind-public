import { Text, View, useColorScheme } from 'react-native';

export default function Greeting() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#fff' }}>
      <Text style={{ color: isDark ? '#fff' : '#000' }}>Hello</Text>
    </View>
  );
}
