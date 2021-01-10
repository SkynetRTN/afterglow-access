import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

//Angular Material
import { MaterialModule } from "../material";

import { SvgModule } from "../svg/svg.module";

import { PipesModule } from "../pipes/pipes.module";
import { JobService } from "./services/jobs";

@NgModule({
  imports: [CommonModule, FormsModule, MaterialModule, PipesModule, SvgModule],
  declarations: [],
  exports: [],
  providers: [JobService],
})
export class JobsModule {}
