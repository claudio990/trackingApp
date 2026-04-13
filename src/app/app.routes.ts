import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Routine } from './pages/routine/routine';
import { DashboardHome } from './pages/dashboard-home/dashboard-home';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
    { path: '', redirectTo: 'routine', pathMatch: 'full' },
    { path: 'login', component: Login },
    { path: 'register', component: Register },
    { path: 'routine', component: Routine, canActivate: [authGuard] },
    { path: 'dashboard', component: DashboardHome, canActivate: [authGuard] },
    { path: '**', redirectTo: 'routine' }
];
