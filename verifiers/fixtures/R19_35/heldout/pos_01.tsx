import * as R from 'react';

interface Settings { fontSize: number; showHints: boolean }

const SettingsContext = R.createContext<Settings>({ fontSize: 14, showHints: true });

export const Editor = () => {
  const { fontSize } = R.useContext(SettingsContext);
  return <textarea style={{ fontSize }} />;
};

export const HintBar = () => {
  const { showHints } = R.useContext(SettingsContext);
  return showHints ? <div className="hints">Press Ctrl+S to save</div> : null;
};
