import { Routes } from '@angular/router';
import { HostelList } from './features/hostels/pages/hostel-list/hostel-list';
import { HostelFormPage } from './features/hostels/pages/hostel-form-page/hostel-form-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'hostels' },
  { path: 'hostels', component: HostelList },
  { path: 'hostels/:id/edit', component: HostelFormPage }
];
