import { Component, OnInit } from '@angular/core';
import { Select, Store } from '@ngxs/store';
import { Logout } from '../../auth.actions';

@Component({
  selector: 'app-logout-page',
  templateUrl: './logout-page.component.html',
  styles: [],
})
export class LogoutPageComponent implements OnInit {
  constructor(private store: Store) {
    
  }

  ngOnInit() {
    this.store.dispatch(new Logout());
  }
}

