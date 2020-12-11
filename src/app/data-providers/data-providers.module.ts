import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { FormsModule } from "@angular/forms";

//Angular Material
import { MaterialModule } from "../material";
import { SvgModule } from "../svg/svg.module";
import { PipesModule } from "../pipes/pipes.module";
import { DataProviderDetailComponent } from "./components/data-provider-detail/data-provider-detail.component";
import { OpenFileDialogComponent } from './components/open-file-dialog/open-file-dialog.component';
import { DxFileManagerModule } from 'devextreme-angular';

@NgModule({
  imports: [CommonModule, FormsModule, MaterialModule, RouterModule, PipesModule, DxFileManagerModule],
  declarations: [DataProviderDetailComponent, OpenFileDialogComponent, OpenFileDialogComponent],
  exports: [DataProviderDetailComponent],
  providers: [],
  entryComponents: [OpenFileDialogComponent]
})
export class DataProvidersModule {}
