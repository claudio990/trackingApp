import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.scss'
})
export class BottomNav {
  private auth = inject(AuthService);
  router = inject(Router);

  get isRoutine()   { return this.router.url.startsWith('/routine'); }
  get isDashboard() { return this.router.url.startsWith('/dashboard'); }

  goToRoutine()   { this.router.navigate(['/routine']); }
  goToDashboard() { this.router.navigate(['/dashboard']); }
  logout()        { this.auth.logout(); this.router.navigate(['/login']); }
}
