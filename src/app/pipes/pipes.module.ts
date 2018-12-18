import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DecimalPipe } from '@angular/common'

import { SlugifyPipe } from './slugify.pipe'
import { TruncatePipe } from './truncate.pipe'
import { DmsPipe } from './dms.pipe'
import { RegionFilterPipe } from './region-filter.pipe'
import { FilteredFilesPipe } from './filtered-files.pipe'

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [
    SlugifyPipe,
    TruncatePipe,
    DmsPipe,
    RegionFilterPipe,
    FilteredFilesPipe,
  ],
  exports: [
    SlugifyPipe,
    TruncatePipe,
    DmsPipe,
    RegionFilterPipe,
    FilteredFilesPipe
  ],
  providers: [SlugifyPipe, TruncatePipe, DmsPipe, DecimalPipe, DatePipe, RegionFilterPipe, FilteredFilesPipe]
})
export class PipesModule { }
