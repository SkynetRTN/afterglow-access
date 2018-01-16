import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { FormsModule } from '@angular/forms';

import { NvD3Module } from 'ng2-nvd3';
import 'd3';
import 'nvd3';

//Angular Material
import { MaterialModule } from '../material';

import { SvgModule } from '../svg/svg.module';

import { PipesModule } from '../pipes/pipes.module';

import { DataFileEffects } from './effects/data-file';

import { DataFileListItemComponent } from './components/data-file-list-item/data-file-list-item.component';

import { reducers } from './reducers';
import { ImageHistChartComponent } from './components/image-hist-chart/image-hist-chart.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    PipesModule,
    NvD3Module,
    SvgModule,


    /**
     * StoreModule.forFeature is used for composing state
     * from feature modules. These modules can be loaded
     * eagerly or lazily and will be dynamically added to
     * the existing state.
     */
    StoreModule.forFeature('dataFiles', reducers),

    /**
     * Effects.forFeature is used to register effects
     * from feature modules. Effects can be loaded
     * eagerly or lazily and will be started immediately.
     *
     * All Effects will only be instantiated once regardless of
     * whether they are registered once or multiple times.
     */
    EffectsModule.forFeature([DataFileEffects]),
  ],
  declarations: [
    DataFileListItemComponent,
    ImageHistChartComponent,
  ],
  exports: [
    DataFileListItemComponent,
    ImageHistChartComponent,
  ],
  providers: [],
})
export class DataFilesModule {}