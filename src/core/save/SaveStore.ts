import type { SaveData } from '@/data/types';
import { defaultSave, migrate } from './SaveData';

const KEY = 'kotk-save';
const BACKUP_KEY = 'kotk-save-corrupt-backup';

/**
 * LocalStorage-backed save store. Reads once at boot; `save()` is debounced
 * so slider drags and rapid changes don't thrash storage.
 */
export class SaveStore {
  data: SaveData;
  private timer: number | null = null;

  constructor() {
    this.data = this.load();
  }

  private load(): SaveData {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultSave();
      return migrate(JSON.parse(raw));
    } catch (err) {
      console.error('Save corrupt — backing up and regenerating.', err);
      const raw = localStorage.getItem(KEY);
      if (raw) localStorage.setItem(BACKUP_KEY, raw);
      return defaultSave();
    }
  }

  /** Debounced write (250 ms). */
  save(): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.flush(), 250);
  }

  flush(): void {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch (err) {
      console.error('Failed to write save:', err);
    }
  }

  reset(): void {
    this.data = defaultSave();
    this.flush();
  }
}

export const saveStore = new SaveStore();
window.addEventListener('beforeunload', () => saveStore.flush());
