import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { FormsModule } from '@angular/forms';

//Angular Material
import { MaterialModule } from '../material';

import { SvgModule } from '../svg/svg.module';

import { PipesModule } from '../pipes/pipes.module';

import { JobEffects } from './effects/job';
import { reducers } from './reducers';
import { JobService } from './services/jobs';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    PipesModule,
    SvgModule,


    /**
     * StoreModule.forFeature is used for composing state
     * from feature modules. These modules can be loaded
     * eagerly or lazily and will be dynamically added to
     * the existing state.
     */
    StoreModule.forFeature('jobs', reducers),

    /**
     * Effects.forFeature is used to register effects
     * from feature modules. Effects can be loaded
     * eagerly or lazily and will be started immediately.
     *
     * All Effects will only be instantiated once regardless of
     * whether they are registered once or multiple times.
     */
    EffectsModule.forFeature([JobEffects]),
  ],
  declarations: [
    
  ],
  exports: [
    
  ],
  providers: [JobService],
})
export class JobsModule { }