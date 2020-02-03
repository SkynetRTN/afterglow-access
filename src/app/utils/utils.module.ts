import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

//Angular Material
import { MaterialModule } from '../material'

import { FocusableCell, CellFocuser} from './cell-focuser/cell-focuser';
import { CorrelationIdGenerator } from './correlated-action';

export const COMPONENTS = [
  FocusableCell,
  CellFocuser
];


@NgModule({
  imports: [
    RouterModule,
    CommonModule,
    FormsModule,
    MaterialModule,
  ],

  declarations: COMPONENTS,
  exports: COMPONENTS

})
export class UtilsModule {
  static forRoot() {
    return {
      ngModule: UtilsModule,
      providers: [
        CorrelationIdGenerator
      ],
    };
  }
}