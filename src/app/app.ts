import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  constructor(
    private auth: AuthService,
    @Inject(PLATFORM_ID) private platformId: any
  ) {}

  ngOnInit() {
    // Only try to verify session in the browser, never on the server
    if (isPlatformBrowser(this.platformId) && this.auth.token) {
      // Silently verify — if it fails, keep the token anyway (network issue, not auth issue)
      this.auth.getUser().subscribe({
        error: (err) => {
          // Only logout on 401 Unauthorized, not on network errors
          if (err.status === 401) {
            this.auth.logout();
          }
        }
      });
    }
  }
}

