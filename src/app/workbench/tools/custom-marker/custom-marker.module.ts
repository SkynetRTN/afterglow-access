import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { UtilsModule } from 'src/app/utils/utils.module';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';
import { FlexLayoutModule } from '@angular/flex-layout';
import { KeyboardShortcutsModule } from 'ng-keyboard-shortcuts';
import { CustomMarkerPanelComponent } from './custom-marker-panel/custom-marker-panel.component';
import { CircleMarkerEditorComponent } from './circle-marker-editor/circle-marker-editor.component';
import { RectangleMarkerEditorComponent } from './rectangle-marker-editor/rectangle-marker-editor.component';



@NgModule({
  declarations: [
    CustomMarkerPanelComponent,
    CircleMarkerEditorComponent,
    RectangleMarkerEditorComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatProgressBarModule,
    MatInputModule,
    MatSlideToggleModule,
    MatTabsModule,
    MatTableModule,
    MatSortModule,
    UtilsModule,
    MatCheckboxModule,
    MatButtonToggleModule,
    MatButtonModule,
    MatMenuModule,
    RouterModule,
    FlexLayoutModule,
    KeyboardShortcutsModule.forRoot(),
    FormsModule
  ],
  exports: [
    CustomMarkerPanelComponent,
    CircleMarkerEditorComponent,
    RectangleMarkerEditorComponent
  ]

})
export class CustomMarkerModule { }
