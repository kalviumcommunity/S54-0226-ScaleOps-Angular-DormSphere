import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-hostel-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './hostel-navbar.html',
  styleUrl: './hostel-navbar.css',
})
export class HostelNavbar {}
