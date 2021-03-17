import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

//Angular Material
import { AppMaterialModule } from '../app-material';

import { SvgModule } from '../svg/svg.module';

import { PipesModule } from '../pipes/pipes.module';
import { JobService } from './services/jobs';

@NgModule({
  imports: [CommonModule, FormsModule, AppMaterialModule, PipesModule, SvgModule],
  declarations: [],
  exports: [],
  providers: [JobService],
})
export class JobsModule {}
