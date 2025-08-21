import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastMessage } from '../../core/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div
        *ngFor="let toast of toasts; trackBy: trackByToast"
        class="toast"
        [ngClass]="'toast-' + toast.type"
      >
        <div class="toast-content">
          <div class="toast-icon">
            <span *ngIf="toast.type === 'success'">✓</span>
            <span *ngIf="toast.type === 'error'">✗</span>
            <span *ngIf="toast.type === 'warning'">⚠</span>
            <span *ngIf="toast.type === 'info'">ℹ</span>
          </div>
          <div class="toast-message">{{ toast.message }}</div>
          <button class="toast-close" (click)="remove(toast.id)">×</button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 400px;
      }

      .toast {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        margin-bottom: 10px;
        overflow: hidden;
        animation: slideIn 0.3s ease-out;
        border-left: 4px solid;
      }

      .toast-success {
        border-left-color: #28a745;
      }

      .toast-error {
        border-left-color: #dc3545;
      }

      .toast-warning {
        border-left-color: #ffc107;
      }

      .toast-info {
        border-left-color: #17a2b8;
      }

      .toast-content {
        display: flex;
        align-items: center;
        padding: 12px 16px;
      }

      .toast-icon {
        margin-right: 12px;
        font-size: 18px;
        font-weight: bold;
      }

      .toast-success .toast-icon {
        color: #28a745;
      }

      .toast-error .toast-icon {
        color: #dc3545;
      }

      .toast-warning .toast-icon {
        color: #ffc107;
      }

      .toast-info .toast-icon {
        color: #17a2b8;
      }

      .toast-message {
        flex: 1;
        font-size: 14px;
        color: #333;
      }

      .toast-close {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #999;
        padding: 0;
        margin-left: 12px;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .toast-close:hover {
        color: #666;
      }

      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `,
  ],
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: ToastMessage[] = [];
  private subscription: Subscription = new Subscription();

  constructor(private toastService: ToastService) {}

  ngOnInit() {
    this.subscription = this.toastService.toasts.subscribe((toasts) => {
      this.toasts = toasts;
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  remove(id: string) {
    this.toastService.remove(id);
  }

  trackByToast(index: number, toast: ToastMessage): string {
    return toast.id;
  }
}
