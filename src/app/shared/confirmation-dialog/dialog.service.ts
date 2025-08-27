import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';

@Injectable({
  providedIn: 'root',
})
export class DialogService {
  constructor(private dialog: MatDialog) {}

  /**
   * Opens a confirmation dialog
   * @param title Dialog title
   * @param message Dialog message (can include HTML)
   * @param options Additional options for the dialog
   * @returns Observable that resolves to true if confirmed, false otherwise
   */
  confirm(
    title: string,
    message: string,
    options?: {
      confirmText?: string;
      cancelText?: string;
      type?: 'info' | 'warning' | 'danger';
    }
  ): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      panelClass: 'custom-dialog-container',
      data: {
        title,
        message,
        confirmText: options?.confirmText || 'Confirm',
        cancelText: options?.cancelText || 'Cancel',
        type: options?.type || 'info',
      },
      autoFocus: false,
      disableClose: true,
    });

    return dialogRef.afterClosed();
  }
}
