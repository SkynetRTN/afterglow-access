import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// import { NvD3Module } from 'ng2-nvd3';
// import 'd3';
// import 'nvd3';

//Angular Material
import { MaterialModule } from '../material';

import { SvgModule } from '../svg/svg.module';

import { PipesModule } from '../pipes/pipes.module';
import { ImageHistChartComponent } from './components/image-hist-chart/image-hist-chart.component';
import { DataFileSelectionListComponent, DataFileListItemComponent } from './components/data-file-selection-list/data-file-selection-list.component';
import { AfterglowPlotlyModule } from '../afterglow-plotly/afterglow-plotly.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    PipesModule,
    // NvD3Module,
    SvgModule,
    AfterglowPlotlyModule,

  ],
  declarations: [
    DataFileListItemComponent,
    ImageHistChartComponent,
    DataFileSelectionListComponent,
  ],
  exports: [
    DataFileListItemComponent,
    ImageHistChartComponent,
    DataFileSelectionListComponent
  ],
  providers: [],
})
export class DataFilesModule { }