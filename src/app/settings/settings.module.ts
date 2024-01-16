import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsPageComponent } from './settings-page/settings-page.component';
import { MatListModule } from '@angular/material/list';
import { RouterModule } from '@angular/router';
import { PhotometrySettingsComponent } from './photometry-settings/photometry-settings.component';
import { WcsCalibrationSettingsComponent } from './wcs-calibration-settings/wcs-calibration-settings.component';
import { ThemeSettingsComponent } from './theme-settings/theme-settings.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { ColorPickerModule } from 'ngx-color-picker';
import { MatSelectModule } from '@angular/material/select';
import { UtilsModule } from '../utils/utils.module';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatButtonModule } from '@angular/material/button';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { ThemePickerModule } from '../theme-picker';



@NgModule({
  providers: [
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline' } }
  ],
  declarations: [
    SettingsPageComponent,
    PhotometrySettingsComponent,
    WcsCalibrationSettingsComponent,
    ThemeSettingsComponent
  ],
  imports: [
    CommonModule,
    MatListModule,
    RouterModule,
    ReactiveFormsModule,
    MatInputModule,
    ColorPickerModule,
    MatSelectModule,
    UtilsModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    FlexLayoutModule,
    MatButtonModule,
    DragDropModule,
    ThemePickerModule

  ]
})
export class SettingsModule { }
