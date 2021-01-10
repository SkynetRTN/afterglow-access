import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import { SvgRectangleComponent } from "./components/svg-rectangle/svg-rectangle.component";

export const COMPONENTS = [SvgRectangleComponent];

@NgModule({
  imports: [CommonModule],
  declarations: COMPONENTS,
  exports: COMPONENTS,
})
export class SvgModule {}
