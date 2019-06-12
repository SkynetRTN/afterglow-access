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

  themes: AfterglowTheme[] = [
    {
      name: 'indigo-light-theme',
      displayName: 'Indigo Light',
      primaryIconColor: '#3949AB',
      secondaryIconColor: '#FFFFFF',
    },
    {
      name: 'cyan-dark-theme',
      displayName: 'Cyan Dark',
      primaryIconColor: '#00BCD4',
      secondaryIconColor: '#616161',
    },
    {
      name: 'high-contrast-theme',
      displayName: 'High Contrast',
      primaryIconColor: '#ffeb3b',
      secondaryIconColor: '#303030',
    }
    
  ];

  constructor(
    private _themeStorage: ThemeStorage,
    private _activatedRoute: ActivatedRoute) {
  }

  installTheme(theme: AfterglowTheme) {
    this._themeStorage.storeTheme(theme);
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
