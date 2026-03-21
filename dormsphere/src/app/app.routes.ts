import { Routes } from '@angular/router';
import { HostelList } from './features/hostels/pages/hostel-list/hostel-list';
import { HostelFormPage } from './features/hostels/pages/hostel-form-page/hostel-form-page';
import { HostelDetailView } from './features/hostels/pages/hostel-detail-view/hostel-detail-view';
import { NavigationPlaceholder } from './features/navigation/pages/navigation-placeholder/navigation-placeholder';
import { Login } from './features/login/login';
import { Dashboard } from './features/dashboard/pages/dashboard/dashboard';
import { AppShell } from './features/layout/pages/app-shell/app-shell';
import { RoomManagement } from './features/rooms/pages/room-management/room-management';
import { RoomFormPage } from './features/rooms/pages/room-form-page/room-form-page';
import { StudentDirectory } from './features/students/pages/student-directory/student-directory';
import { StudentFormPage } from './features/students/pages/student-form-page/student-form-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: Login },
  {
    path: '',
    component: AppShell,
    children: [
      { path: 'dashboard', component: Dashboard },
      { path: 'hostels', component: HostelList },
      { path: 'hostels/new', component: HostelFormPage },
      { path: 'hostels/:id/edit', component: HostelFormPage },
      { path: 'hostels/:id', component: HostelDetailView },
      { path: 'rooms', component: RoomManagement },
      { path: 'rooms/new', component: RoomFormPage },
      { path: 'rooms/:id/edit', component: RoomFormPage },
      { path: 'students', component: StudentDirectory },
      { path: 'students/new', component: StudentFormPage },
      { path: 'students/:id/edit', component: StudentFormPage },
      { path: 'maintenance', component: NavigationPlaceholder },
      { path: 'reports', component: NavigationPlaceholder },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
