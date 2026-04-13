import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { TrackingService } from '../../services/tracking';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.scss'
})
export class DashboardHome implements OnInit {
  loading = false;
  metrics: any = null;

  // Date filter
  fromDate: string;
  toDate: string;

  // Task filter
  taskSearch: string = '';

  constructor(
    private router: Router,
    private auth: AuthService,
    private tracking: TrackingService,
    private cdr: ChangeDetectorRef
  ) {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    this.fromDate = firstOfMonth.toISOString().split('T')[0];
    this.toDate   = now.toISOString().split('T')[0];
  }

  ngOnInit() { this.loadMetrics(); }

  loadMetrics() {
    this.loading = true;
    this.cdr.detectChanges();
    this.tracking.getMetrics(this.fromDate, this.toDate).subscribe({
      next: res => { this.metrics = res; this.loading = false; this.cdr.detectChanges(); },
      error: ()  => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  shiftIcon(shift: string) {
    return shift === 'Morning' ? '🌅' : shift === 'Afternoon' ? '☀️' : '🌙';
  }

  shiftName(shift: string) {
    return shift === 'Morning' ? 'Mañana' : shift === 'Afternoon' ? 'Tarde' : 'Noche';
  }

  barWidth(pct: number) { return Math.max(4, pct) + '%'; }

  // Best 5 days from daily array (sorted by pct desc)
  get topDays() {
    if (!this.metrics?.daily) return [];
    return [...this.metrics.daily].sort((a: any, b: any) => b.pct - a.pct).slice(0, 5);
  }

  get bestTasks() {
    if (!this.metrics?.tasks) return [];
    return this.metrics.tasks.slice(0, 3);
  }

  get worstTasks() {
    if (!this.metrics?.tasks) return [];
    return [...this.metrics.tasks].reverse().slice(0, 3);
  }

  get filteredTasks() {
    if (!this.metrics?.tasks) return [];
    if (!this.taskSearch) return this.metrics.tasks;
    const s = this.taskSearch.toLowerCase();
    return this.metrics.tasks.filter((t: any) => t.name.toLowerCase().includes(s));
  }

  // Grade based on overall %
  get grade() {
    const p = this.metrics?.summary?.pct ?? 0;
    if (p >= 90) return { label: 'Elite 🏆', color: '#43A047' };
    if (p >= 70) return { label: 'Constante 💪', color: '#00ACC1' };
    if (p >= 50) return { label: 'En Progreso 🔥', color: '#FF9800' };
    return { label: 'Arranca 🌱', color: '#E53935' };
  }

  goToRoutine()   { this.router.navigate(['/routine']); }
  logout()        { this.auth.logout(); this.router.navigate(['/login']); }
}
