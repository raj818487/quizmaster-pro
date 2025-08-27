import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { ExtendedUser } from '../user-models';

@Component({
  selector: 'app-activity-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './activity-dialog.component.html',
  styleUrls: ['./activity-dialog.component.scss'],
})
export class ActivityDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ActivityDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { user: ExtendedUser }
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}
