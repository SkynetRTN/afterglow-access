import { Injectable, EventEmitter } from "@angular/core";

export interface PlotlyTheme {
  xAxisColor: string;
  yAxisColor: string;
  fontColor: string;
  paperBgColor: string;
  plotBgColor: string;
  colorWay: string[];
  modeBarBgColor: string;
  modeBarColor: string;
  modeBarActiveColor: string;
  legendFontColor: string;
}

export interface DevExTheme {
  name: string;
}

export interface AfterglowTheme {
  colorThemeName: string;
  fontSize: "default" | "large" | "largest";
  fontWeight: "default" | "bold" | "boldest";
}

export interface AfterglowColorTheme {
  name: string;
  displayName: string;
  primaryIconColor: string;
  secondaryIconColor: string;
  plotlyTheme: PlotlyTheme;
  devExTheme: DevExTheme;
}

@Injectable()
export class ThemeStorage {
  static themeStorageKey = "afterglow-theme-storage-201907050912";

  onThemeUpdate: EventEmitter<AfterglowTheme> = new EventEmitter<AfterglowTheme>();

  colorThemes: AfterglowColorTheme[] = [
    {
      name: "indigo-light-theme",
      displayName: "Indigo Light",
      primaryIconColor: "#3949AB",
      secondaryIconColor: "#FFFFFF",
      plotlyTheme: {
        xAxisColor: "#000000",
        yAxisColor: "#000000",
        fontColor: "#000000",
        paperBgColor: "#FFFFFF",
        plotBgColor: "#FFFFFF",
        colorWay: [
          "#3949AB",
          "#ff7f0e",
          "#2ca02c",
          "#d62728",
          "#9467bd",
          "#8c564b",
          "#e377c2",
          "#7f7f7f",
          "#bcbd22",
          "#17becf",
        ],
        modeBarBgColor: "#FFFFFF",
        modeBarColor: "#757575",
        modeBarActiveColor: "#757575",
        legendFontColor: "#757575",
      },
      devExTheme: {
        name: "dx.light",
      },
    },
    {
      name: "cyan-dark-theme",
      displayName: "Cyan Dark",
      primaryIconColor: "#00BCD4",
      secondaryIconColor: "#616161",
      plotlyTheme: {
        xAxisColor: "#FFFFFF",
        yAxisColor: "#FFFFFF",
        fontColor: "#FFFFFF",
        paperBgColor: "#424242",
        plotBgColor: "#424242",
        colorWay: [
          "#00BCD4",
          "#ff7f0e",
          "#2ca02c",
          "#d62728",
          "#9467bd",
          "#8c564b",
          "#e377c2",
          "#7f7f7f",
          "#bcbd22",
          "#17becf",
        ],
        modeBarBgColor: "#424242",
        modeBarColor: "#FFFFFF",
        modeBarActiveColor: "#FFFFFF",
        legendFontColor: "#FFFFFF",
      },
      devExTheme: {
        name: "dx.dark",
      },
    },
    {
      name: "high-contrast-theme",
      displayName: "Yellow on Black",
      primaryIconColor: "#ffeb3b",
      secondaryIconColor: "#303030",
      plotlyTheme: {
        xAxisColor: "#FFEB3B",
        yAxisColor: "#FFEB3B",
        fontColor: "#FFEB3B",
        paperBgColor: "#424242",
        plotBgColor: "#424242",
        colorWay: [
          "#FFEB3B",
          "#ff7f0e",
          "#2ca02c",
          "#d62728",
          "#9467bd",
          "#8c564b",
          "#e377c2",
          "#7f7f7f",
          "#bcbd22",
          "#17becf",
        ],
        modeBarBgColor: "#424242",
        modeBarColor: "#FFEB3B",
        modeBarActiveColor: "#FFEB3B",
        legendFontColor: "#FFEB3B",
      },
      devExTheme: {
        name: "dx.dark",
      },
    },
  ];

  storeTheme(theme: AfterglowTheme) {
    try {
      window.localStorage[ThemeStorage.themeStorageKey] = JSON.stringify(theme);
    } catch {}

    this.onThemeUpdate.emit(theme);
  }

  getCurrentTheme(): AfterglowTheme {
    try {
      let currentTheme = JSON.parse(window.localStorage[ThemeStorage.themeStorageKey]);
      if (!currentTheme) return null;
      return currentTheme;
    } catch {
      return null;
    }
  }

  getCurrentColorTheme(): AfterglowColorTheme {
    let theme = this.getCurrentTheme();
    if (!theme) return null;
    return this.colorThemes.find((t) => t.name == theme.colorThemeName) || null;
  }

  getColorThemeByName(name: string) {
    let colorTheme = this.colorThemes.find((t) => t.name == name);
    return colorTheme ? colorTheme : null;
  }

  clearStorage() {
    try {
      window.localStorage.removeItem(ThemeStorage.themeStorageKey);
    } catch {}
  }
}
