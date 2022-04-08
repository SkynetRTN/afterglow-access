import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

//Angular Material
import { AppMaterialModule } from '../app-material';

import { SvgModule } from '../svg/svg.module';

import { PipesModule } from '../pipes/pipes.module';
import { JobService } from './services/jobs';
import { JobsTableComponent } from './components/jobs-table/jobs-table.component';
import { JobDetailsComponent } from './components/job-details/job-details.component';
import { JobsManagerComponent } from './containers/jobs-manager/jobs-manager.component';
import { FlexLayoutModule } from '@angular/flex-layout';
import { UtilsModule } from '../utils/utils.module';

@NgModule({
  imports: [CommonModule, FormsModule, AppMaterialModule, PipesModule, SvgModule, FlexLayoutModule, UtilsModule.forRoot()],
  declarations: [
    JobsTableComponent,
    JobDetailsComponent,
    JobsManagerComponent
  ],
  exports: [],
  providers: [JobService],
})
export class JobsModule { }
