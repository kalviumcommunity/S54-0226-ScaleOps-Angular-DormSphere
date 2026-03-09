import { Component } from '@angular/core';
import { HostelNavbar } from '../../components/hostel-navbar/hostel-navbar';

@Component({
  selector: 'app-hostel-list',
  imports: [HostelNavbar],
  templateUrl: './hostel-list.html',
  styleUrl: './hostel-list.css',
})
export class HostelList {

}
