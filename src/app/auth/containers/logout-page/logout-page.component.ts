import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Authenticate } from '../../models/user';
import * as fromAuth from '../../reducers';
import * as Auth from '../../actions/auth';

@Component({
  selector: 'app-logout-page',
  templateUrl: './logout-page.component.html',
  styles: [],
})
export class LogoutPageComponent implements OnInit {
  constructor(private store: Store<fromAuth.State>) {
    
  }

  ngOnInit() {
    this.store.dispatch(new Auth.Logout());
  }
}

