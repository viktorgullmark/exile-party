import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import {
  MatButtonModule, MatInputModule, MatOptionModule, MatSelectModule, MatIconModule,
  MatStepperModule, MatProgressBarModule, MatCheckboxModule, MatRadioModule, MatDividerModule, MatGridListModule,
  MatCardModule,
  MatProgressSpinnerModule
} from '@angular/material';
import { MatFormFieldModule } from '@angular/material/form-field';

import { LoginComponent } from './login.component';
import { SharedModule } from '../shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ClearHistoryDialogModule } from '../shared/components/clear-history-dialog/clear-history-dialog.module';
import { ClearHistoryDialogComponent } from '../shared/components/clear-history-dialog/clear-history-dialog.component';
import { InfoDialogComponent } from '../authorize/components/info-dialog/info-dialog.component';
import { InfoDialogModule } from '../authorize/components/info-dialog/info-dialog.module';
import { ErrorMessageDialogComponent } from '../authorize/components/error-message-dialog/error-message-dialog.component';
import { ErrorMessageDialogModule } from '../authorize/components/error-message-dialog/error-message-dialog.module';

@NgModule({
  imports: [
    SharedModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatIconModule,
    MatCheckboxModule,
    MatStepperModule,
    MatButtonModule,
    MatRadioModule,
    MatOptionModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressBarModule,
    InfoDialogModule,
    ClearHistoryDialogModule,
    ErrorMessageDialogModule,
    MatDividerModule,
    MatGridListModule,
    MatCardModule,
    MatProgressSpinnerModule
  ],
  declarations: [LoginComponent],
  entryComponents: [ClearHistoryDialogComponent, ErrorMessageDialogComponent, InfoDialogComponent]
})
export class LoginModule { }
