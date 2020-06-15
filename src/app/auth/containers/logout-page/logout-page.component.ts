import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Select, Store } from '@ngxs/store';
import { Logout } from '../../auth.actions';

@Component({
  selector: 'app-logout-page',
  templateUrl: './logout-page.component.html',
  styleUrls: ['./logout-page.component.css']
})
export class LogoutPageComponent implements OnInit, AfterViewInit {
  constructor(private store: Store) {
    
  }

  ngOnInit() {
    //logging out resets the application state
    //call async to prevent disrupting Angular change detection lifecycle
    setTimeout(() => {
      this.store.dispatch(new Logout());
  });
  }

  ngAfterViewInit() {
    
  }
}

