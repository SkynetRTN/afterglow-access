import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DisplayPanelComponent } from './display-panel/display-panel.component';
import { DataFilesModule } from 'src/app/data-files/data-files.module';
import { MatIconModule } from '@angular/material/icon';
import { NormalizerFormComponent } from './normalizer-form/normalizer-form.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { ImageOrientationToolbarComponent } from './image-orientation-toolbar/image-orientation-toolbar.component';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FlexLayoutModule } from '@angular/flex-layout';
import { NormalizerComponent } from './normalizer/normalizer.component';
import { MatCheckboxModule } from '@angular/material/checkbox';



@NgModule({
  declarations: [
    DisplayPanelComponent,
    NormalizerFormComponent,
    ImageOrientationToolbarComponent,
    NormalizerComponent
  ],
  imports: [
    CommonModule,
    DataFilesModule,
    MatIconModule,
    ReactiveFormsModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatMenuModule,
    MatSlideToggleModule,
    FormsModule,
    FlexLayoutModule,
    MatCheckboxModule
  ],
  exports: [
    DisplayPanelComponent
  ]
})
export class DisplayModule { }
