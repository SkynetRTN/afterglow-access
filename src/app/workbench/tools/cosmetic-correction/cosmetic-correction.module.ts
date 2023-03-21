import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CosmeticCorrectionPanelComponent } from './cosmetic-correction-panel/cosmetic-correction-panel.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';



@NgModule({
  declarations: [
    CosmeticCorrectionPanelComponent
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
    MatButtonModule,
  ],
  exports: [
    CosmeticCorrectionPanelComponent
  ]
})
export class CosmeticCorrectionModule { }
