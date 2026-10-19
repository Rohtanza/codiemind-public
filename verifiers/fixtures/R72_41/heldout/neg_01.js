export const preferences = {
  applyTheme(theme) {
    document.body.dataset.theme = theme;
  },
  userSettings() {
    return { theme: "dark", fontSize: 14 };
  },
};
