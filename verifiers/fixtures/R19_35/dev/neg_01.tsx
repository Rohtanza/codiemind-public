import { createContext } from 'react';

const LocaleContext = createContext<string>('en');

export function Greeting() {
  return (
    <LocaleContext.Consumer>
      {(locale) => <p>{locale === 'fr' ? 'Bonjour' : 'Hello'}</p>}
    </LocaleContext.Consumer>
  );
}

export function App() {
  return (
    <LocaleContext.Provider value="fr">
      <Greeting />
    </LocaleContext.Provider>
  );
}
