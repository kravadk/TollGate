const STORAGE_KEY = "codex:notifications";
const MAX = 50;

export type NotifKind = "success" | "error" | "info" | "warn";

export type Notification = {
  id: string;
  kind: NotifKind;
  message: string;
  at: number;
  read: boolean;
  href?: string;
};

type Listener = (notifications: Notification[]) => void;

function load(): Notification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Notification[]) : [];
  } catch {
    return [];
  }
}

function save(ns: Notification[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ns)); } catch {}
}

class NotificationStore {
  private _items: Notification[] = load();
  private _listeners = new Set<Listener>();

  get items() { return this._items; }
  get unread() { return this._items.filter((n) => !n.read).length; }

  push(kind: NotifKind, message: string, href?: string) {
    const n: Notification = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind,
      message,
      at: Date.now(),
      read: false,
      href,
    };
    this._items = [n, ...this._items].slice(0, MAX);
    save(this._items);
    this._emit();
  }

  markAllRead() {
    this._items = this._items.map((n) => ({ ...n, read: true }));
    save(this._items);
    this._emit();
  }

  clear() {
    this._items = [];
    save(this._items);
    this._emit();
  }

  subscribe(fn: Listener): () => void {
    this._listeners.add(fn);
    return () => { this._listeners.delete(fn); };
  }

  private _emit() {
    for (const fn of this._listeners) fn(this._items);
  }
}

export const notifStore = new NotificationStore();
