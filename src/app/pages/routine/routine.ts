import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { TrackingService } from '../../services/tracking';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-routine',
  standalone: true,
  imports: [CommonModule, DragDropModule, FormsModule],
  templateUrl: './routine.html',
  styleUrl: './routine.scss'
})
export class Routine implements OnInit {
  days_es = [
    { name: 'Lun', code: 'Monday' },
    { name: 'Mar', code: 'Tuesday' },
    { name: 'Mié', code: 'Wednesday' },
    { name: 'Jue', code: 'Thursday' },
    { name: 'Vie', code: 'Friday' },
    { name: 'Sáb', code: 'Saturday' },
    { name: 'Dom', code: 'Sunday' }
  ];
  selectedDay = '';
  todayCode = '';
  viewDate = ''; // The actual date we are viewing / checking

  availableTasks: any[] = [];
  allRoutines: any = {};

  morningList: any[] = [];
  afternoonList: any[] = [];
  nightList: any[] = [];

  // ── Add-task dialog ──────────────────────────────────────────────────────
  showDialog = false;
  dialogShift = '';
  dialogSearch = '';
  newTaskName = '';
  newTaskIcon = '✅';
  showNewTaskForm = false;

  // ── Copy dialog ──────────────────────────────────────────────────────────
  showCopyDialog = false;
  copyFromShift: string = '';   // '' means whole day
  copyToDays: Record<string, boolean> = {}; // dynamic object for selected days
  copyToShift: string = '';     // '' means keep original shifts
  copyMsg = '';
  isCopying = false;

  readonly shiftsOptions = [
    { label: 'Todos los turnos', value: '' },
    { label: '🌅 Mañana',        value: 'Morning' },
    { label: '☀️ Tarde',         value: 'Afternoon' },
    { label: '🌙 Noche',         value: 'Night' },
  ];

  get filteredTasks() {
    const q = this.dialogSearch.toLowerCase();
    return this.availableTasks.filter(t =>
      t.name.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q)
    );
  }

  get shiftLabel() {
    const m: any = { Morning: '🌅 Mañana', Afternoon: '☀️ Tarde', Night: '🌙 Noche' };
    return m[this.dialogShift] || '';
  }

  constructor(
    private tracking: TrackingService,
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const now = new Date();
    this.todayCode = dayNames[now.getDay()];
    this.selectedDay = this.todayCode;
    this.viewDate = now.toISOString().split('T')[0];
    
    this.loadTasks();
    this.loadRoutines(this.viewDate);
  }

  // ── Data loading ─────────────────────────────────────────────────────────
  loadTasks() {
    this.tracking.getTasks().subscribe(res => { this.availableTasks = res; });
  }

  loadRoutines(date?: string) {
    this.tracking.getRoutines(date).subscribe(res => {
      this.allRoutines = res;
      this.updateDayView();
    });
  }

  selectDay(dayCode: string) {
    this.selectedDay = dayCode;
    // Calculate the date for this day in the current week
    this.viewDate = this.getWeekDate(dayCode);
    this.loadRoutines(this.viewDate);
  }

  getWeekDate(dayCode: string): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetIdx = days.indexOf(dayCode);
    const now = new Date();
    const todayIdx = now.getDay();
    
    // Simple logic: get the date for the target day within the current rolling week
    const diff = targetIdx - todayIdx;
    const target = new Date(now);
    target.setDate(now.getDate() + diff);
    
    return target.toISOString().split('T')[0];
  }

  updateDayView() {
    const dr = this.allRoutines[this.selectedDay] || [];
    this.morningList   = dr.filter((r: any) => r.shift === 'Morning').sort((a: any, b: any) => a.order_index - b.order_index);
    this.afternoonList = dr.filter((r: any) => r.shift === 'Afternoon').sort((a: any, b: any) => a.order_index - b.order_index);
    this.nightList     = dr.filter((r: any) => r.shift === 'Night').sort((a: any, b: any) => a.order_index - b.order_index);
  }

  // ── Helper: get the list array for a shift ───────────────────────────────
  private listFor(shift: string): any[] {
    return shift === 'Morning' ? this.morningList : shift === 'Afternoon' ? this.afternoonList : this.nightList;
  }

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  drop(event: CdkDragDrop<any[]>, shift: string) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      this.saveOrder(event.container.data, shift);
    } else if (event.previousContainer.id === 'taskList') {
      const item = event.previousContainer.data[event.previousIndex];
      this.addTaskToShift(item, shift, event.currentIndex);
    } else {
      const prevShift = event.previousContainer.id.includes('afternoon') ? 'Afternoon'
                      : event.previousContainer.id.includes('night') ? 'Night' : 'Morning';
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
      this.saveOrder(event.container.data, shift);
      this.saveOrder(event.previousContainer.data, prevShift);
    }
  }

  // ── Add task (optimistic) ─────────────────────────────────────────────────
  addTaskToShift(task: any, shift: string, orderIndex = 999) {
    // Optimistic: add a temp item right away
    const tempId = Date.now();
    const temp = { id: tempId, task, task_id: task.id, shift, day_of_week: this.selectedDay, time: null, is_completed: false, order_index: orderIndex, _temp: true };
    this.listFor(shift).push(temp);
    this.cdr.detectChanges();

    this.tracking.addRoutine({ task_id: task.id, day_of_week: this.selectedDay, shift, order_index: orderIndex })
      .subscribe(res => {
        // Replace temp with real
        const list = this.listFor(shift);
        const idx  = list.findIndex((r: any) => r.id === tempId);
        if (idx >= 0) list.splice(idx, 1, res);
        // Sync allRoutines
        this.allRoutines[this.selectedDay] = [...this.morningList, ...this.afternoonList, ...this.nightList];
        this.cdr.detectChanges();
      });
  }

  saveOrder(list: any[], shift: string) {
    const payload = list.filter(r => !r._temp).map((item, index) => ({ id: item.id, order_index: index, shift }));
    if (payload.length > 0) this.tracking.updateOrder(payload).subscribe();
  }

  toggleCheck(routine: any) {
    routine.is_completed = !routine.is_completed;   // optimistic
    this.cdr.detectChanges(); // Force view update
    
    this.tracking.toggleCheck(routine.id, this.viewDate).subscribe({
      next: res => { routine.is_completed = res.is_completed; this.cdr.detectChanges(); },
      error: () => { routine.is_completed = !routine.is_completed; this.cdr.detectChanges(); }  // rollback
    });
  }

  updateTime(routine: any) {
    if (!routine._temp) this.tracking.updateRoutineTime(routine.id, routine.time).subscribe();
  }

  // ── Delete (optimistic) ───────────────────────────────────────────────────
  deleteRoutine(id: number, shift: string) {
    const list = this.listFor(shift);
    const idx  = list.findIndex((r: any) => r.id === id);
    if (idx >= 0) list.splice(idx, 1);   // remove optimistically
    this.tracking.removeRoutine(id).subscribe({
      error: () => this.loadRoutines()   // rollback on error
    });
  }

  // ── Add-task dialog ───────────────────────────────────────────────────────
  openDialog(shift: string) {
    this.dialogShift = shift;
    this.dialogSearch = '';
    this.showNewTaskForm = false;
    this.newTaskName = '';
    this.newTaskIcon = '✅';
    this.showDialog = true;
  }
  closeDialog() { this.showDialog = false; }

  selectTaskFromDialog(task: any) {
    this.addTaskToShift(task, this.dialogShift);
    this.closeDialog();
    this.cdr.detectChanges();
  }

  createAndAddTask() {
    if (!this.newTaskName.trim()) return;

    // Optimistic UI for new task & routine
    const tempTaskId = Date.now();
    const tempRoutineId = tempTaskId + 1;
    const tempTask = { id: tempTaskId, name: this.newTaskName.trim(), icon: this.newTaskIcon };
    
    this.availableTasks.push(tempTask);

    const tempRoutine = { 
      id: tempRoutineId, task: tempTask, task_id: tempTaskId, shift: this.dialogShift, 
      day_of_week: this.selectedDay, time: null, is_completed: false, order_index: 999, _temp: true 
    };
    this.listFor(this.dialogShift).push(tempRoutine);
    
    this.closeDialog();
    this.cdr.detectChanges();

    // Backend Execution
    this.tracking.createTask({ name: tempTask.name, icon: tempTask.icon }).subscribe(dbTask => {
      const tIdx = this.availableTasks.findIndex(t => t.id === tempTaskId);
      if (tIdx >= 0) this.availableTasks[tIdx] = dbTask;

      this.tracking.addRoutine({ task_id: dbTask.id, day_of_week: this.selectedDay, shift: this.dialogShift, order_index: 999 })
        .subscribe(dbRoutine => {
          const list = this.listFor(this.dialogShift);
          const rIdx  = list.findIndex((r: any) => r.id === tempRoutineId);
          if (rIdx >= 0) list.splice(rIdx, 1, dbRoutine);
          this.allRoutines[this.selectedDay] = [...this.morningList, ...this.afternoonList, ...this.nightList];
          this.cdr.detectChanges();
        });
    });
  }

  // ── Copy dialog ───────────────────────────────────────────────────────────
  openCopyDialog() {
    this.copyFromShift = '';
    // Initialize with only the current day selected
    this.copyToDays = {
      'Monday': false, 'Tuesday': false, 'Wednesday': false,
      'Thursday': false, 'Friday': false, 'Saturday': false, 'Sunday': false
    };
    this.copyToDays[this.selectedDay] = true;
    this.copyToShift   = '';
    this.copyMsg       = '';
    this.isCopying     = false;
    this.showCopyDialog = true;
  }
  closeCopyDialog() { this.showCopyDialog = false; }

  executeCopy() {
    this.copyMsg = '';
    const selectedToDays = Object.keys(this.copyToDays).filter(day => this.copyToDays[day]);

    if(selectedToDays.length === 0) {
      this.copyMsg = '❌ Selecciona al menos un día destino';
      return;
    }

    this.isCopying = true;

    const payload: any = {
      from_day: this.selectedDay,
      to_days:  selectedToDays,
    };
    if (this.copyFromShift) payload['from_shift'] = this.copyFromShift;
    if (this.copyToShift)   payload['to_shift']   = this.copyToShift;

    this.tracking.copyRoutine(payload).subscribe({
      next: res => {
        this.isCopying = false;
        this.copyMsg = `✅ Se copiaron ${res.created} tarea(s)`;
        this.loadRoutines();
        setTimeout(() => this.closeCopyDialog(), 1200);
      },
      error: () => { 
        this.isCopying = false;
        this.copyMsg = '❌ Error al copiar'; 
      }
    });
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  trackById(_: number, item: any) { return item.id; }
  logout()        { this.auth.logout(); this.router.navigate(['/login']); }
  goToDashboard() { this.router.navigate(['/dashboard']); }
}
