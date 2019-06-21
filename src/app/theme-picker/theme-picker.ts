import {
  Component,
  ViewEncapsulation,
  ChangeDetectionStrategy,
  NgModule,
  OnInit,
  OnDestroy,
} from '@angular/core';
import {ThemeStorage, AfterglowTheme} from './theme-storage/theme-storage';
import {
  MatButtonModule,
  MatGridListModule,
  MatIconModule,
  MatMenuModule,
  MatTooltipModule,
} from '@angular/material';
import {CommonModule} from '@angular/common';
import {ActivatedRoute} from '@angular/router';


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
  availableThemes: AfterglowTheme[];
  

  constructor(
    private themeStorage: ThemeStorage,
    private _activatedRoute: ActivatedRoute) {
      this.availableThemes = themeStorage.themes;
      this.currentTheme = themeStorage.getCurrentTheme();
      themeStorage.onThemeUpdate.subscribe(theme => {
        this.currentTheme = theme;
      });
  }

  installTheme(theme: AfterglowTheme) {
    this.themeStorage.storeTheme(theme);
  }

  ngOnInit() {
  }

  ngOnDestroy() {
  }

}

@NgModule({
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatGridListModule,
    MatTooltipModule,
    CommonModule
  ],
  exports: [ThemePicker],
  declarations: [ThemePicker],
  providers: [ThemeStorage],
})
export class ThemePickerModule { }
