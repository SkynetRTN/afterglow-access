import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DecimalPipe } from '@angular/common';

import { SlugifyPipe } from './slugify.pipe';
import { TruncatePipe } from './truncate.pipe';
import { DmsPipe } from './dms.pipe';
import { RegionFilterPipe } from './region-filter.pipe';
import { FilteredFilesPipe } from './filtered-files.pipe';
import { CoreCasePipe } from './core-case.pipe';
import { JsonSortedPipe } from './json-sorted.pipe';

@NgModule({
  imports: [CommonModule],
  declarations: [SlugifyPipe, TruncatePipe, DmsPipe, RegionFilterPipe, FilteredFilesPipe, CoreCasePipe, JsonSortedPipe],
  exports: [SlugifyPipe, TruncatePipe, DmsPipe, RegionFilterPipe, FilteredFilesPipe, CoreCasePipe, JsonSortedPipe],
  providers: [SlugifyPipe, TruncatePipe, DmsPipe, DecimalPipe, DatePipe, RegionFilterPipe, FilteredFilesPipe, CoreCasePipe, JsonSortedPipe],
})
export class PipesModule { }
