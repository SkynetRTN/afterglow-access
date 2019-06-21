import {Injectable, EventEmitter} from '@angular/core';

export interface PlotlyTheme {
  xAxisColor: string,
  yAxisColor: string,
  fontColor: string,
  paperBgColor: string;
  plotBgColor: string;
  colorWay: string;
  modeBarBgColor: string;
  modeBarColor: string;
  modeBarActiveColor: string;
  legendFontColor: string;
}

export interface AfterglowTheme {
  name: string;
  displayName: string;
  primaryIconColor: string;
  secondaryIconColor: string;
  plotlyTheme: PlotlyTheme;
}


@Injectable()
export class ThemeStorage {
  static storageKey = 'afterglow-theme-storage-current-name';

  onThemeUpdate: EventEmitter<AfterglowTheme> = new EventEmitter<AfterglowTheme>();

  themes: AfterglowTheme[] = [
    {
      name: 'indigo-light-theme',
      displayName: 'Indigo Light',
      primaryIconColor: '#3949AB',
      secondaryIconColor: '#FFFFFF',
      plotlyTheme: {
        xAxisColor: '#000000',
        yAxisColor: '#000000',
        fontColor: '#000000',
        paperBgColor: '#FFFFFF',
        plotBgColor: '#FFFFFF',
        colorWay: '#1f77b4#ff7f0e#2ca02c#d62728#9467bd#8c564b#e377c2#7f7f7f#bcbd22#17becf',
        modeBarBgColor: '#FFFFFF',
        modeBarColor: '#757575',
        modeBarActiveColor:  '#757575',
        legendFontColor: '#757575'
      }
    },
    {
      name: 'cyan-dark-theme',
      displayName: 'Cyan Dark',
      primaryIconColor: '#00BCD4',
      secondaryIconColor: '#616161',
      plotlyTheme: {
        xAxisColor: '#FFFFFF',
        yAxisColor: '#FFFFFF',
        fontColor: '#FFFFFF',
        paperBgColor: '#424242',
        plotBgColor: '#424242',
        colorWay: '#1f77b4#ff7f0e#2ca02c#d62728#9467bd#8c564b#e377c2#7f7f7f#bcbd22#17becf',
        modeBarBgColor: '#424242',
        modeBarColor: '#FFFFFF',
        modeBarActiveColor:  '#FFFFFF',
        legendFontColor: '#FFFFFF'
      }
    },
    {
      name: 'high-contrast-theme',
      displayName: 'High Contrast',
      primaryIconColor: '#ffeb3b',
      secondaryIconColor: '#303030',
      plotlyTheme: {
        xAxisColor: '#FFEB3B',
        yAxisColor: '#FFEB3B',
        fontColor: '#FFEB3B',
        paperBgColor: '#424242',
        plotBgColor: '#424242',
        colorWay: '#1f77b4#ff7f0e#2ca02c#d62728#9467bd#8c564b#e377c2#7f7f7f#bcbd22#17becf',
        modeBarBgColor: '#424242',
        modeBarColor: '#FFEB3B',
        modeBarActiveColor:  '#FFEB3B',
        legendFontColor: '#FFEB3B'
      }
      
    }
    
  ];

  storeTheme(theme: AfterglowTheme) {
    try {
      window.localStorage[ThemeStorage.storageKey] = theme.name;
    } catch { }

    this.onThemeUpdate.emit(theme);
  }

  getCurrentTheme(): AfterglowTheme {
    if(!this.getStoredThemeName()) return null;
    let theme = this.themes.find(t => t.name == this.getStoredThemeName());
    return theme ? theme : null;
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
