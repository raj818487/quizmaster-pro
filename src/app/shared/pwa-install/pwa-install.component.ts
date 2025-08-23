import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PwaService } from '../../core/pwa.service';

@Component({
  selector: 'app-pwa-install',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pwa-install-banner" *ngIf="showInstallBanner && !isStandalone">
      <div class="banner-content">
        <div class="banner-text">
          <h3>Install QuizMaster Pro</h3>
          <p>
            Get the full app experience - install QuizMaster Pro on your device!
          </p>
        </div>
        <div class="banner-actions">
          <button class="install-btn" (click)="installApp()">
            <i class="material-icons">download</i>
            Install
          </button>
          <button class="close-btn" (click)="dismissBanner()">
            <i class="material-icons">close</i>
          </button>
        </div>
      </div>
    </div>

    <button
      *ngIf="!showInstallBanner && canInstall && !isStandalone"
      class="floating-install-btn"
      (click)="installApp()"
      title="Install QuizMaster Pro"
    >
      <i class="material-icons">download</i>
    </button>

    <div class="pwa-status" *ngIf="isStandalone">
      <i class="material-icons">check_circle</i>
      App Installed
    </div>
  `,
  styles: [
    `
      .pwa-install-banner {
        position: fixed;
        bottom: 20px;
        left: 20px;
        right: 20px;
        background: linear-gradient(135deg, #1976d2, #1565c0);
        color: white;
        padding: 16px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        max-width: 500px;
        margin: 0 auto;
      }

      .banner-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .banner-text h3 {
        margin: 0 0 4px 0;
        font-size: 16px;
        font-weight: 500;
      }

      .banner-text p {
        margin: 0;
        font-size: 14px;
        opacity: 0.9;
      }

      .banner-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .install-btn {
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 14px;
        transition: background 0.2s;
      }

      .install-btn:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .close-btn {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
      }

      .close-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .floating-install-btn {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #1976d2;
        color: white;
        border: none;
        border-radius: 50%;
        width: 56px;
        height: 56px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .floating-install-btn:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      }

      .pwa-status {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4caf50;
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 14px;
        z-index: 1000;
      }

      @media (max-width: 768px) {
        .pwa-install-banner {
          left: 10px;
          right: 10px;
          bottom: 10px;
        }

        .banner-content {
          flex-direction: column;
          align-items: stretch;
          text-align: center;
        }

        .banner-actions {
          justify-content: center;
        }
      }
    `,
  ],
})
export class PwaInstallComponent implements OnInit {
  showInstallBanner = false;
  canInstall = false;
  isStandalone = false;

  constructor(private pwaService: PwaService) {}

  ngOnInit(): void {
    this.checkPwaStatus();

    // Show banner after a delay
    setTimeout(() => {
      this.showInstallBanner = this.canInstall && !this.isStandalone;
    }, 3000);
  }

  private checkPwaStatus(): void {
    this.canInstall = this.pwaService.canInstall();
    this.isStandalone = this.pwaService.isStandalone();
  }

  async installApp(): Promise<void> {
    const installed = await this.pwaService.showInstallPrompt();
    if (installed) {
      this.showInstallBanner = false;
      this.checkPwaStatus();
    }
  }

  dismissBanner(): void {
    this.showInstallBanner = false;
    // Store dismissal in localStorage to not show again for a while
    localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
  }
}
