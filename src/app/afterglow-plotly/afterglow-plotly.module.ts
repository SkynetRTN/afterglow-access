import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AfterglowPlotComponent } from './plot/afterglow-plot.component';

import { PlotlyViaWindowModule } from 'angular-plotly.js';

@NgModule({
  declarations: [AfterglowPlotComponent],
  imports: [
    CommonModule,
    PlotlyViaWindowModule
  ],
  exports: [
    AfterglowPlotComponent,
    PlotlyViaWindowModule
  ]
})
export class AfterglowPlotlyModule { }
