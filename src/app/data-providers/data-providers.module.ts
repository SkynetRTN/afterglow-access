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
import { FileManagerComponent } from "./components/file-manager/file-manager.component";
import { SaveDialogComponent } from "./components/save-dialog/save-dialog.component";
import { FlexLayoutModule } from '@angular/flex-layout';
import { NameDialogComponent } from './components/name-dialog/name-dialog.component';
import { UtilsModule } from '../utils/utils.module';
import { TargetDialogComponent } from './components/target-dialog/target-dialog.component';
import { UploadDialogComponent } from './components/upload-dialog/upload-dialog.component';

@NgModule({
  imports: [CommonModule, FormsModule, MaterialModule, RouterModule, PipesModule, ReactiveFormsModule, FlexLayoutModule, UtilsModule],
  declarations: [
    DataProviderDetailComponent,
    OpenFileDialogComponent,
    SaveDialogComponent,
    FileManagerComponent,
    SaveDialogComponent,
    NameDialogComponent,
    TargetDialogComponent,
    UploadDialogComponent
  ],
  exports: [DataProviderDetailComponent],
  providers: [],
  entryComponents: [OpenFileDialogComponent, SaveDialogComponent, NameDialogComponent, TargetDialogComponent, UploadDialogComponent],
})
export class DataProvidersModule {}
