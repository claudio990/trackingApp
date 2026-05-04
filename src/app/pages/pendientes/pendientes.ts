import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TrackingService } from '../../services/tracking';
import { AuthService } from '../../services/auth';
import { BottomNav } from '../../components/bottom-nav/bottom-nav';
import { PushNotificationService } from '../../services/push-notifications';

interface Pendiente {
  id: number;
  title: string;
  description?: string;
  due_at: string;
  notified_1h: boolean;
  notified_5m: boolean;
  completed_at: string | null;
}

@Component({
  selector: 'app-pendientes',
  standalone: true,
  imports: [CommonModule, FormsModule, BottomNav],
  templateUrl: './pendientes.html',
  styleUrl: './pendientes.scss'
})
export class Pendientes implements OnInit {
  private tracking = inject(TrackingService);
  private auth     = inject(AuthService);
  private router   = inject(Router);
  private cdr      = inject(ChangeDetectorRef);
  private pushNotif = inject(PushNotificationService);

  pendientes: Pendiente[] = [];
  showCompleted = false;
  loading = false;

  // Quick add
  newTitle = '';
  newDueAt = '';

  ngOnInit() {
    // Default new due_at: now + 1h, rounded
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    this.newDueAt = this.toLocalInput(d);

    this.load();
  }

  load() {
    this.loading = true;
    this.tracking.getPendientes(this.showCompleted).subscribe({
      next: res => { this.pendientes = res; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  add() {
    if (!this.newTitle.trim() || !this.newDueAt) return;

    const payload = {
      title: this.newTitle.trim(),
      due_at: new Date(this.newDueAt).toISOString().slice(0, 19).replace('T', ' '),
    };

    // Optimistic
    const temp: Pendiente = {
      id: -Date.now(),
      title: payload.title,
      due_at: payload.due_at,
      notified_1h: false, notified_5m: false, completed_at: null
    };
    this.pendientes = [...this.pendientes, temp].sort(this.sortFn);
    const t = this.newTitle;
    this.newTitle = '';
    this.cdr.detectChanges();

    this.tracking.createPendiente(payload).subscribe({
      next: real => {
        const i = this.pendientes.findIndex(p => p.id === temp.id);
        if (i >= 0) this.pendientes[i] = real;
        this.pendientes = [...this.pendientes].sort(this.sortFn);
        this.cdr.detectChanges();
      },
      error: () => {
        this.pendientes = this.pendientes.filter(p => p.id !== temp.id);
        this.newTitle = t;
        this.cdr.detectChanges();
      }
    });
  }

  toggle(p: Pendiente) {
    const before = p.completed_at;
    p.completed_at = before ? null : new Date().toISOString();
    this.cdr.detectChanges();
    this.tracking.togglePendiente(p.id).subscribe({
      next: res => { p.completed_at = res.completed_at; this.cdr.detectChanges(); },
      error: () => { p.completed_at = before; this.cdr.detectChanges(); }
    });
  }

  remove(p: Pendiente) {
    const idx = this.pendientes.findIndex(x => x.id === p.id);
    if (idx < 0) return;
    const removed = this.pendientes[idx];
    this.pendientes.splice(idx, 1);
    this.cdr.detectChanges();
    this.tracking.deletePendiente(p.id).subscribe({
      error: () => { this.pendientes.splice(idx, 0, removed); this.cdr.detectChanges(); }
    });
  }

  toggleCompletedFilter() {
    this.showCompleted = !this.showCompleted;
    this.load();
  }

  async enableNotifications() {
    await this.pushNotif.requestPermission();
    this.cdr.detectChanges();
  }

  get notifGranted() {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  private sortFn = (a: Pendiente, b: Pendiente): number => {
    // Pending before completed
    if (!a.completed_at && b.completed_at) return -1;
    if (a.completed_at && !b.completed_at) return 1;
    return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
  };

  private toLocalInput(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  relativeTime(dueAt: string): string {
    const due = new Date(dueAt).getTime();
    const now = Date.now();
    const diff = due - now;
    const abs = Math.abs(diff);
    const min = Math.round(abs / 60000);
    const hr  = Math.round(abs / 3600000);
    const day = Math.round(abs / 86400000);

    let str: string;
    if (min < 60)  str = `${min}m`;
    else if (hr < 24) str = `${hr}h`;
    else str = `${day}d`;

    return diff < 0 ? `hace ${str}` : `en ${str}`;
  }

  isOverdue(p: Pendiente): boolean {
    return !p.completed_at && new Date(p.due_at).getTime() < Date.now();
  }

  isSoon(p: Pendiente): boolean {
    if (p.completed_at) return false;
    const diff = new Date(p.due_at).getTime() - Date.now();
    return diff > 0 && diff <= 60 * 60 * 1000;
  }

  formatDate(dueAt: string): string {
    const d = new Date(dueAt);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  goToRoutine()  { this.router.navigate(['/routine']); }
  logout()       { this.auth.logout(); this.router.navigate(['/login']); }
  trackById(_: number, p: Pendiente) { return p.id; }
}
