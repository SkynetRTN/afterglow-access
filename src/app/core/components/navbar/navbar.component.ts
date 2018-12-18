import { Component, OnInit, Input } from '@angular/core';
import { TourService } from "ngx-tour-ngx-popper";

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  @Input() authenticated: boolean = false;


  constructor(private tourService: TourService) { }

  ngOnInit() {
  }

}
