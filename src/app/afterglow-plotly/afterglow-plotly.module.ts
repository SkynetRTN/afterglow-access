import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AfterglowPlotComponent } from './plot/afterglow-plot.component';

import { PlotlyViaWindowModule } from 'angular-plotly.js';


//see https://github.com/plotly/plotly.js/issues/3518
//had to manually change plotly.js line 32481  from }(); to }.apply(self);

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
