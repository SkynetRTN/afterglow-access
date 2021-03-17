import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// import { NvD3Module } from 'ng2-nvd3';
// import 'd3';
// import 'nvd3';

//Angular Material
import { AppMaterialModule } from '../app-material';

import { SvgModule } from '../svg/svg.module';

import { PipesModule } from '../pipes/pipes.module';
import { ImageHistChartComponent } from './components/image-hist-chart/image-hist-chart.component';
import { AfterglowPlotlyModule } from '../afterglow-plotly/afterglow-plotly.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    AppMaterialModule,
    PipesModule,
    // NvD3Module,
    SvgModule,
    AfterglowPlotlyModule,
  ],
  declarations: [ImageHistChartComponent],
  exports: [ImageHistChartComponent],
  providers: [],
})
export class DataFilesModule {}
