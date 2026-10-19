import React, { createContext, useContext, useState } from 'react';

type Theme = 'light' | 'dark';
const ThemeContext = createContext<Theme>('light');

function Header() {
  const theme = useContext(ThemeContext);
  return <header className={`header-${theme}`}>My App</header>;
}

function Footer() {
  const theme = useContext(ThemeContext);
  return <footer className={`footer-${theme}`}>© 2026</footer>;
}

export default function App() {
  const [theme] = useState<Theme>('dark');
  return (
    <ThemeContext.Provider value={theme}>
      <Header />
      <Footer />
    </ThemeContext.Provider>
  );
}
