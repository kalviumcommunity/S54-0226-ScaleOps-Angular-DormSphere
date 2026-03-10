import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HostelNavbar } from '../../../hostels/components/hostel-navbar/hostel-navbar';

@Component({
  selector: 'app-navigation-placeholder',
  imports: [HostelNavbar, RouterLink],
  templateUrl: './navigation-placeholder.html',
  styleUrl: './navigation-placeholder.css',
})
export class NavigationPlaceholder {
  private readonly route = inject(ActivatedRoute);

  readonly pageTitle = this.resolveTitle();

  private resolveTitle(): string {
    const path = this.route.snapshot.routeConfig?.path ?? 'page';

    const map: Record<string, string> = {
      dashboard: 'Dashboard',
      rooms: 'Rooms',
      students: 'Students',
      maintenance: 'Maintenance',
      reports: 'Reports',
    };

    return map[path] ?? 'Navigation Page';
  }
}
