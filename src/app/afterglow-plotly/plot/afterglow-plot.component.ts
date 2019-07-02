import { Component, OnInit, Input, OnChanges, SimpleChanges, ChangeDetectorRef, IterableDiffers, KeyValueDiffers } from '@angular/core';
// import { PlotComponent as AngularPlotlyPlotComponent, PlotlyService } from 'angular-plotly.js';
import { PlotlyTheme } from '../../theme-picker/theme-storage/theme-storage';
import * as deepmerge from 'deepmerge'
import { PlotlyService, PlotComponent } from 'angular-plotly.js';

@Component({
  selector: 'afterglow-plot',
  template: `<div #plot [attr.id]="divId" [className]="getClassName()" [ngStyle]="style"></div>`,
  providers: [PlotlyService],
})
export class AfterglowPlotComponent extends PlotComponent implements OnChanges {


  @Input() theme?: PlotlyTheme;


  constructor(public plotly: PlotlyService,
    public iterableDiffers: IterableDiffers,
    public keyValueDiffers: KeyValueDiffers,
    private _changeDetectorRef: ChangeDetectorRef) {
    super(plotly, iterableDiffers, keyValueDiffers);
    
  }

  updatePlotlyTheme(theme: PlotlyTheme) {

    let themedLayout = {
      xaxis: {
        color: theme.xAxisColor
      }, 
      yaxis: {
        color: theme.yAxisColor
      },
      modebar: {
        bgcolor: theme.modeBarBgColor,
        color: theme.modeBarColor,
        activecolor: theme.modeBarActiveColor,
      },
      font: {
        color: theme.fontColor
      },
      legend: {
        font: {
          color: theme.legendFontColor
        }
      },
      paper_bgcolor: theme.paperBgColor,
      plot_bgcolor: theme.plotBgColor,
      colorway: theme.colorWay
    }

    this.layout = deepmerge(this.layout, themedLayout);
    

   
  }

  ngOnChanges(changes: SimpleChanges) {
    this.updatePlotlyTheme(this.theme);
  }

}
