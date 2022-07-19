import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

//Angular Material
import { AppMaterialModule } from '../app-material';
import { SvgModule } from '../svg/svg.module';
import { PipesModule } from '../pipes/pipes.module';
import { OpenFileDialogComponent } from './components/open-file-dialog/open-file-dialog.component';
import { FileManagerComponent } from './components/file-manager/file-manager.component';
import { SaveDialogComponent } from './components/save-dialog/save-dialog.component';
import { FlexLayoutModule } from '@angular/flex-layout';
import { NameDialogComponent } from './components/name-dialog/name-dialog.component';
import { UtilsModule } from '../utils/utils.module';
import { TargetDialogComponent } from './components/target-dialog/target-dialog.component';
import { UploadDialogComponent } from './components/upload-dialog/upload-dialog.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        AppMaterialModule,
        RouterModule,
        PipesModule,
        ReactiveFormsModule,
        FlexLayoutModule,
        UtilsModule,
    ],
    declarations: [
        OpenFileDialogComponent,
        SaveDialogComponent,
        FileManagerComponent,
        SaveDialogComponent,
        NameDialogComponent,
        TargetDialogComponent,
        UploadDialogComponent,
    ],
    exports: [],
    providers: []
})
export class DataProvidersModule {}
