import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

//Angular Material
import { MaterialModule } from "../material";
import { SvgModule } from "../svg/svg.module";
import { PipesModule } from "../pipes/pipes.module";
import { DataProviderDetailComponent } from "./components/data-provider-detail/data-provider-detail.component";
import { OpenFileDialogComponent } from "./components/open-file-dialog/open-file-dialog.component";
import { DxFileManagerModule } from "devextreme-angular";
import { FileManagerComponent } from "./components/file-manager/file-manager.component";
import { SaveDialogComponent } from "./components/save-dialog/save-dialog.component";
import { FlexLayoutModule } from '@angular/flex-layout';
import { RenameDialogComponent } from './components/name-dialog/name-dialog.component';
import { UtilsModule } from '../utils/utils.module';

@NgModule({
  imports: [CommonModule, FormsModule, MaterialModule, RouterModule, PipesModule, DxFileManagerModule, ReactiveFormsModule, FlexLayoutModule, UtilsModule],
  declarations: [
    DataProviderDetailComponent,
    OpenFileDialogComponent,
    SaveDialogComponent,
    FileManagerComponent,
    SaveDialogComponent,
    RenameDialogComponent,
  ],
  exports: [DataProviderDetailComponent],
  providers: [],
  entryComponents: [OpenFileDialogComponent, SaveDialogComponent, RenameDialogComponent],
})
export class DataProvidersModule {}
