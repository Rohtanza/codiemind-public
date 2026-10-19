export interface ThemeColours {
  base: string;
  highlight: string;
}

// Picks the highlight colour for the current organisation theme.
export function highlightFor(theme: ThemeColours, dark: boolean): string {
  const highlightColorHex = dark ? "#ffffff" : theme.highlight;
  return highlightColorHex;
}
