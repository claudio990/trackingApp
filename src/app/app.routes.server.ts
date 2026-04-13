import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Public pages can be prerendered
  { path: 'login', renderMode: RenderMode.Prerender },
  { path: 'register', renderMode: RenderMode.Prerender },
  // Protected pages: render on the client only (no localStorage on server)
  { path: 'routine', renderMode: RenderMode.Client },
  { path: 'dashboard', renderMode: RenderMode.Client },
  { path: '', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Client },
];
