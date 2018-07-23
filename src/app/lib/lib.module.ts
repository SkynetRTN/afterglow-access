import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpModule } from '@angular/http';
import { RouterModule } from '@angular/router';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { FormsModule } from '@angular/forms';

//Angular Material
import { MaterialModule } from '../material'

import { FocusableCell, CellFocuser} from './cell-focuser/cell-focuser';

export const COMPONENTS = [
  FocusableCell,
  CellFocuser
];


@NgModule({
  imports: [
    RouterModule,
    CommonModule,
    HttpModule,
    FormsModule,
    MaterialModule,
  ],

  declarations: COMPONENTS,
  exports: COMPONENTS

})
export class LibModule {
  static forRoot() {
    return {
      ngModule: LibModule
    };
  }
}