import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
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
import { AligningPanelComponent } from './aligning-panel/aligning-panel.component';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';



@NgModule({
  declarations: [
    AligningPanelComponent
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
    RouterModule,
    MatButtonModule,
  ],
  exports: [AligningPanelComponent]
})
export class AligningModule { }
