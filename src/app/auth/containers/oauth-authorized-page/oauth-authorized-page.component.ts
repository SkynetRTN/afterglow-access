import { Component, OnInit, OnDestroy } from '@angular/core';
import { Select, Store } from '@ngxs/store';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { LoginOAuth } from '../../auth.actions';
import { Navigate } from '@ngxs/router-plugin';

@Component({
  selector: 'app-oauth-authorized-page',
  templateUrl: './oauth-authorized-page.component.html',
  styleUrls: ['./oauth-authorized-page.component.css']
})
export class OauthAuthorizedPageComponent implements OnInit, OnDestroy {
  private sub: Subscription;

  constructor(private store: Store, private activatedRoute: ActivatedRoute, private router: Router) { }

  ngOnInit() {
    this.sub = this.activatedRoute.queryParams.subscribe(queryParams => {
      if(!localStorage.getItem('pendingOauthMethod')) {
        this.store.dispatch(new Navigate(["/login"], {}, {replaceUrl:true}));
      }
      else {
        if(queryParams['code']) {
          let pendingOAuth = JSON.parse(localStorage.getItem('pendingOauthMethod'));
          this.store.dispatch(new LoginOAuth(pendingOAuth.id, pendingOAuth.redirectUri, queryParams['code']));
        }
        else {
          //TODO show error
        }
        localStorage.removeItem('pendingOauthMethod');

      }
    })
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

}
