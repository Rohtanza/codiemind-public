import { Image, useColorScheme as useScheme } from 'react-native';

const logos = {
  light: require('../assets/logo-light.png'),
  dark: require('../assets/logo-dark.png'),
};

export function Logo() {
  const scheme = useScheme() ?? 'light';
  return <Image source={logos[scheme]} style={{ width: 120, height: 40 }} />;
}
