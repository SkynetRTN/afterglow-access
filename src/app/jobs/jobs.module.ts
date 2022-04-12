import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

//Angular Material
import { AppMaterialModule } from '../app-material';

import { SvgModule } from '../svg/svg.module';

import { PipesModule } from '../pipes/pipes.module';
import { JobService } from './services/jobs';
import { JobsTableComponent } from './components/jobs-table/jobs-table.component';
import { JobDetailsComponent } from './components/job-details/job-details.component';
import { FlexLayoutModule } from '@angular/flex-layout';
import { UtilsModule } from '../utils/utils.module';
import { NgxJsonViewerModule } from 'ngx-json-viewer';
import { HighlightJsModule } from 'ngx-highlight-js';
import { JobsPageComponent } from './containers/jobs-page/jobs-page.component';

@NgModule({
  imports: [CommonModule, FormsModule, ReactiveFormsModule, AppMaterialModule, PipesModule, SvgModule, FlexLayoutModule, UtilsModule.forRoot(), NgxJsonViewerModule, HighlightJsModule],
  declarations: [
    JobsTableComponent,
    JobDetailsComponent,
    JobsPageComponent
  ],
  exports: [],
  providers: [JobService],
})
export class JobsModule { }
