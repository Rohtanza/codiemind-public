interface Note {
  id: string;
  body: string;
}

const KEY = 'offline-notes';

export function saveNotes(notes: Note[]): void {
  localStorage.setItem(KEY, JSON.stringify(notes));
}

export function loadNotes(): Note[] {
  const raw = localStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as Note[]) : [];
}
