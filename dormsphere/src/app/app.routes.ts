import { Routes } from '@angular/router';
import { HostelList } from './features/hostels/pages/hostel-list/hostel-list';
import { HostelFormPage } from './features/hostels/pages/hostel-form-page/hostel-form-page';
import { HostelDetailView } from './features/hostels/pages/hostel-detail-view/hostel-detail-view';
import { NavigationPlaceholder } from './features/navigation/pages/navigation-placeholder/navigation-placeholder';
import { Login } from './features/login/login';
import { Dashboard } from './features/dashboard/pages/dashboard/dashboard';
import { AppShell } from './features/layout/pages/app-shell/app-shell';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: Login},
  { path: 'hostels/:id', component: HostelDetailView },
  {
    path: '',
    component: AppShell,
    children: [
      { path: 'dashboard', component: Dashboard },
      { path: 'hostels', component: HostelList },
      { path: 'hostels/new', component: HostelFormPage },
      { path: 'hostels/:id/edit', component: HostelFormPage },
      { path: 'rooms', component: NavigationPlaceholder },
      { path: 'students', component: NavigationPlaceholder },
      { path: 'maintenance', component: NavigationPlaceholder },
      { path: 'reports', component: NavigationPlaceholder },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
