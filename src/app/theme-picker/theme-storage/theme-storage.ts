import {Injectable, EventEmitter} from '@angular/core';

export interface AfterglowTheme {
  name: string;
  displayName: string;
  primaryIconColor: string;
  secondaryIconColor: string;
}


@Injectable()
export class ThemeStorage {
  static storageKey = 'afterglow-theme-storage-current-name';

  onThemeUpdate: EventEmitter<AfterglowTheme> = new EventEmitter<AfterglowTheme>();

  storeTheme(theme: AfterglowTheme) {
    try {
      window.localStorage[ThemeStorage.storageKey] = theme.name;
    } catch { }

    this.onThemeUpdate.emit(theme);
  }

  getStoredThemeName(): string | null {
    try {
      return window.localStorage[ThemeStorage.storageKey] || null;
    } catch {
      return null;
    }
  }

  clearStorage() {
    try {
      window.localStorage.removeItem(ThemeStorage.storageKey);
    } catch { }
  }
}
