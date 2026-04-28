import { Injectable, inject } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private swPush = inject(SwPush);
  private http   = inject(HttpClient);

  get isSupported() {
    return this.swPush.isEnabled && 'Notification' in window;
  }

  get permissionGranted() {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported) return false;
    if (this.permissionGranted) return true;

    if (!environment.vapidPublicKey) {
      // SW enabled but VAPID not configured — just request browser permission
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    }

    try {
      const sub = await this.swPush.requestSubscription({
        serverPublicKey: environment.vapidPublicKey
      });
      await this.saveSubscription(sub);
      return true;
    } catch {
      return false;
    }
  }

  private saveSubscription(sub: PushSubscription) {
    return this.http
      .post(`${environment.apiUrl}/push/subscribe`, sub)
      .toPromise();
  }
}
