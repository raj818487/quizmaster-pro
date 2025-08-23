import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class PwaService {
  private promptEvent: any;

  constructor() {
    this.listenForInstallPrompt();
    this.registerServiceWorker();
  }

  // Register service worker manually
  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully:', registration);

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                if (confirm('New version available. Load?')) {
                  window.location.reload();
                }
              }
            });
          }
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  // Listen for install prompt
  private listenForInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      this.promptEvent = e;
      console.log('Install prompt available');
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      this.promptEvent = null;
    });
  }

  // Show install prompt
  public showInstallPrompt(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.promptEvent) {
        this.promptEvent.prompt();
        this.promptEvent.userChoice.then((result: any) => {
          console.log('User choice:', result);
          this.promptEvent = null;
          resolve(result.outcome === 'accepted');
        });
      } else {
        console.log('Install prompt not available');
        resolve(false);
      }
    });
  }

  // Check if app can be installed
  public canInstall(): boolean {
    return !!this.promptEvent;
  }

  // Check if app is in standalone mode (installed)
  public isStandalone(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  }

  // Request notification permission
  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      return await Notification.requestPermission();
    }
    return 'denied';
  }

  // Show notification
  public showNotification(title: string, options?: NotificationOptions): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/icon-192.svg',
        badge: '/favicon.ico',
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }

  // Register for background sync
  public async registerBackgroundSync(tag: string): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if ('sync' in registration) {
          await (registration as any).sync.register(tag);
        }
      } catch (error) {
        console.error('Background sync registration failed:', error);
      }
    }
  }

  // Check if PWA is supported
  public isPWASupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }
}
