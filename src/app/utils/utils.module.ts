import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

//Angular Material
import { AppMaterialModule } from '../app-material';

import { FocusableCell, CellFocuser } from './cell-focuser/cell-focuser';
import { CorrelationIdGenerator } from './correlated-action';
import { PrintFormErrorComponent } from './print-form-error/print-form-error.component';
import { AlertDialogComponent } from './alert-dialog/alert-dialog.component';
import { GuardTypePipe } from './guard-type.pipe';
import { ResizeDirective } from './directives/resize.directive';

export const COMPONENTS = [FocusableCell, CellFocuser, PrintFormErrorComponent, AlertDialogComponent, GuardTypePipe, ResizeDirective];

@NgModule({
  imports: [RouterModule, CommonModule, FormsModule, AppMaterialModule],
  declarations: COMPONENTS,
  exports: COMPONENTS
})
export class UtilsModule {
  static forRoot(): ModuleWithProviders<UtilsModule> {
    return {
      ngModule: UtilsModule,
      providers: [CorrelationIdGenerator],
    };
  }
}
