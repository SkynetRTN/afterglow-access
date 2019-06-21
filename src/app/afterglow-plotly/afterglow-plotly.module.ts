import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlotComponent } from './plot/plot.component';

import * as PlotlyJS from 'plotly.js/dist/plotly.js';
import { PlotlyModule } from 'angular-plotly.js';

PlotlyModule.plotlyjs = PlotlyJS;

@NgModule({
  declarations: [PlotComponent],
  imports: [
    CommonModule,
    PlotlyModule
  ],
  exports: [
    PlotComponent
  ]
})
export class AfterglowPlotlyModule { }
