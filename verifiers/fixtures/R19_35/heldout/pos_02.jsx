import { createContext, useContext, useState } from 'react';

const NotificationsContext = createContext({ messages: [], push: () => {} });

export function NotificationsProvider({ children }) {
  const [messages, setMessages] = useState([]);
  const push = (msg) => setMessages((prev) => [...prev, msg]);
  return (
    <NotificationsContext.Provider value={{ messages, push }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function NotifyButton() {
  const { push } = useContext(NotificationsContext);
  return <button onClick={() => push('Saved')}>Save</button>;
}

export function NotificationList() {
  const { messages } = useContext(NotificationsContext);
  return <ul>{messages.map((m, i) => <li key={i}>{m}</li>)}</ul>;
}
