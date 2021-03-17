import {
  Component,
  OnInit,
  Input,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
  IterableDiffers,
  KeyValueDiffers,
} from '@angular/core';
// import { PlotComponent as AngularPlotlyPlotComponent, PlotlyService } from 'angular-plotly.js';
import { PlotlyTheme } from '../../theme-picker/theme-storage/theme-storage';
import * as deepmerge from 'deepmerge';
import { PlotlyService, PlotlyComponent } from 'angular-plotly.js';

@Component({
  selector: 'afterglow-plot',
  template: `<plotly-plot #plot *ngIf="data" [data]="data" [config]="config" [layout]="layout"></plotly-plot>`,
  providers: [PlotlyService],
})
export class AfterglowPlotComponent implements OnChanges {
  @Input() theme?: PlotlyTheme;
  @Input() config: any;
  @Input() data: any;
  @Input() layout: any;

  @Input('layout')
  set _layout(value: any) {
    this.layout = value;
  }

  constructor(
    public plotly: PlotlyService,
    public iterableDiffers: IterableDiffers,
    public keyValueDiffers: KeyValueDiffers,
    private _changeDetectorRef: ChangeDetectorRef
  ) {}

  updatePlotlyTheme(theme: PlotlyTheme) {
    let themedLayout = {
      xaxis: {
        color: theme.xAxisColor,
      },
      yaxis: {
        color: theme.yAxisColor,
      },
      modebar: {
        bgcolor: theme.modeBarBgColor,
        color: theme.modeBarColor,
        activecolor: theme.modeBarActiveColor,
      },
      font: {
        color: theme.fontColor,
      },
      legend: {
        font: {
          color: theme.legendFontColor,
        },
      },
      paper_bgcolor: theme.paperBgColor,
      plot_bgcolor: theme.plotBgColor,
      colorway: theme.colorWay,
    };

    this.layout = deepmerge(this.layout, themedLayout, {
      arrayMerge: (destinationArray, sourceArray, options) => sourceArray,
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    this.updatePlotlyTheme(this.theme);
  }
}
