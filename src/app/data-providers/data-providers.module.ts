import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { FormsModule } from '@angular/forms';

//Angular Material
import { MaterialModule } from '../material';
import { SvgModule } from '../svg/svg.module';
import { PipesModule } from '../pipes/pipes.module';
import { DataProviderDetailComponent } from './components/data-provider-detail/data-provider-detail.component';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    RouterModule,
    PipesModule,
  ],
  declarations: [
    DataProviderDetailComponent
  ],
  exports: [
    DataProviderDetailComponent
  ],
  providers: [],
})
export class DataProvidersModule { }