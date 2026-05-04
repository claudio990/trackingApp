import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TrackingService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private auth: AuthService) { }

  getTasks() {
    return this.http.get<any[]>(`${this.apiUrl}/tasks`, this.auth.headers);
  }

  getRoutines(date?: string) {
    const url = date ? `${this.apiUrl}/routines?date=${date}` : `${this.apiUrl}/routines`;
    return this.http.get<any>(url, this.auth.headers);
  }

  addRoutine(data: any) {
    return this.http.post<any>(`${this.apiUrl}/routines`, data, this.auth.headers);
  }

  removeRoutine(id: number) {
    return this.http.delete<any>(`${this.apiUrl}/routines/${id}`, this.auth.headers);
  }

  updateOrder(items: any[]) {
    return this.http.post(`${this.apiUrl}/routines/update-order`, { items }, this.auth.headers);
  }

  toggleCheck(id: number, date: string) {
    return this.http.post<any>(`${this.apiUrl}/routines/${id}/check`, { date }, this.auth.headers);
  }

  createTask(data: { name: string; icon: string; description?: string }) {
    return this.http.post<any>(`${this.apiUrl}/tasks`, data, this.auth.headers);
  }

  updateRoutineTime(id: number, time: string) {
    return this.http.patch<any>(`${this.apiUrl}/routines/${id}/time`, { time }, this.auth.headers);
  }

  copyRoutine(payload: { from_day: string; from_shift?: string; to_days: string[]; to_shift?: string }) {
    return this.http.post<any>(`${this.apiUrl}/routines/copy`, payload, this.auth.headers);
  }

  getMetrics(from: string, to: string) {
    return this.http.get<any>(`${this.apiUrl}/metrics?from=${from}&to=${to}`, this.auth.headers);
  }

  // ── Pendientes ───────────────────────────────────────────────────────────
  getPendientes(includeCompleted = false) {
    const q = includeCompleted ? '?include_completed=1' : '';
    return this.http.get<any[]>(`${this.apiUrl}/pendientes${q}`, this.auth.headers);
  }

  createPendiente(data: { title: string; description?: string; due_at: string }) {
    return this.http.post<any>(`${this.apiUrl}/pendientes`, data, this.auth.headers);
  }

  updatePendiente(id: number, data: any) {
    return this.http.patch<any>(`${this.apiUrl}/pendientes/${id}`, data, this.auth.headers);
  }

  togglePendiente(id: number) {
    return this.http.post<any>(`${this.apiUrl}/pendientes/${id}/toggle`, {}, this.auth.headers);
  }

  deletePendiente(id: number) {
    return this.http.delete(`${this.apiUrl}/pendientes/${id}`, this.auth.headers);
  }
}
