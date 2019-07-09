import {
  Component,
  ViewEncapsulation,
  ChangeDetectionStrategy,
  NgModule,
  OnInit,
  OnDestroy,
} from '@angular/core';
import {ThemeStorage, AfterglowColorTheme, AfterglowTheme} from './theme-storage/theme-storage';
import { MatButtonModule } from '@angular/material/button';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import {CommonModule} from '@angular/common';
import {ActivatedRoute} from '@angular/router';
import { MatButtonToggleModule, MatButtonToggleChange, MatFormField, MatFormFieldModule, MatSelectModule } from '@angular/material';


@Component({
  selector: 'theme-picker',
  templateUrl: 'theme-picker.html',
  styleUrls: ['theme-picker.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {'aria-hidden': 'true'},
})
export class ThemePicker implements OnInit, OnDestroy {
  currentTheme: AfterglowTheme;
  availableColorThemes: AfterglowColorTheme[];
  

  constructor(
    private themeStorage: ThemeStorage,
    private _activatedRoute: ActivatedRoute) {
      this.availableColorThemes = themeStorage.colorThemes;
      this.currentTheme = themeStorage.getCurrentTheme();
      themeStorage.onThemeUpdate.subscribe(theme => {
        this.currentTheme = theme;
      });
  }

  setColorTheme(colorThemeName: string) {
    console.log(colorThemeName);
    this.themeStorage.storeTheme({
      ...this.currentTheme,
      colorThemeName: colorThemeName
    });
  }

  setFontSize($value: MatButtonToggleChange) {
    this.themeStorage.storeTheme({
      ...this.currentTheme,
      fontSize: $value.value
    });
  }

  setFontWeight($value: MatButtonToggleChange) {
    this.themeStorage.storeTheme({
      ...this.currentTheme,
      fontWeight: $value.value
    });
  }

  ngOnInit() {
  }

  ngOnDestroy() {
  }

}

@NgModule({
  imports: [
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatMenuModule,
    MatGridListModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatSelectModule,
    CommonModule
  ],
  exports: [ThemePicker],
  declarations: [ThemePicker],
  providers: [ThemeStorage],
})
export class ThemePickerModule { }
