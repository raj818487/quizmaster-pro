import { Injectable } from '@angular/core';

// Type declaration for electron API
declare global {
  interface Window {
    electronAPI?: {
      send: (channel: string, data?: any) => void;
      receive: (channel: string, func: (...args: any[]) => void) => void;
    };
  }
}

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  send(channel: string, data?: any) {
    // Only run in browser
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.send(channel, data);
    }
  }
  receive(channel: string, func: (...args: any[]) => void) {
    // Only run in browser
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.receive(channel, func);
    }
  }
}
