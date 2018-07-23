import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import { Store } from '@ngrx/store';
import * as fromAuth from '../../reducers';
import * as authActions from '../../actions/auth';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs/Rx';
import { OAuthClient } from '../../models/oauth-client';
import { environment } from '../../../../environments/environment.prod';

@Component({
  selector: 'app-oauth-client-consent-page',
  templateUrl: './oauth-client-consent-page.component.html',
  styleUrls: ['./oauth-client-consent-page.component.css']
})
export class OauthClientConsentPageComponent implements OnInit, AfterViewInit {
  sub: Subscription;
  permittedClientIds$: Observable<string[]>;
  oAuthClients$: Observable<OAuthClient[]>;
  oAuthClient$: Observable<OAuthClient>;
  loading$: Observable<boolean>;
  consented$: Observable<boolean>;
  next$: Observable<string>;

  constructor(private store: Store<fromAuth.State>, private activatedRoute: ActivatedRoute, private router: Router) {
    this.store.dispatch(new authActions.LoadPermittedOAuthClientIds());
    this.store.dispatch(new authActions.LoadOAuthClients());
    this.permittedClientIds$ = this.store.select(fromAuth.getPermittedOAuthClients);
    this.oAuthClients$ = this.store.select(fromAuth.getOAuthClients);
    

    this.oAuthClient$ = Observable.combineLatest(
      this.activatedRoute.queryParams,
      this.oAuthClients$
    )
    .map(([queryParams, clients]) => {
      if(!queryParams['client_id']) return null;
      let client = clients.find(client => client.clientId == queryParams['client_id']);
      if(!client) return null;
      return client;
    })
    .filter(client => client !== null);

    this.next$ = this.activatedRoute.queryParams
    .map(queryParams => {
      if(!queryParams['next']) return null;
      return queryParams['next'];
    })
    .filter(next => next !== null);

    this.consented$ = Observable.combineLatest(
      this.oAuthClient$,
      this.permittedClientIds$,
    )
    .map(([client, permittedClients]) => {
      return client && permittedClients.find(permittedClientId => permittedClientId == client.clientId) !== undefined;
    })

    this.sub = this.consented$
      .withLatestFrom(this.oAuthClient$, this.next$)
      .subscribe(([consented, client, next]) => {
      if(!consented || !next) return;

      window.location.href = next;
    })


    this.loading$ = Observable.combineLatest(
      this.store.select(fromAuth.getLoadingOAuthClients),
      this.store.select(fromAuth.getLoadingPermittedOAuthClientIds),
      this.consented$
    )
    .map(([loadingClients, loadingPermittedClientIds, consented]) => {
      return loadingClients || loadingPermittedClientIds || consented;
    })
    
  }

  ngOnInit() {
    
  }

  ngAfterViewInit() {
  }

  addPermittedOAuthClient(client: OAuthClient) {
    this.store.dispatch(new authActions.AddPermittedOAuthClient({client: client}));
  }

  onCancelClick(client: OAuthClient) {
    if(!client || !client.redirectUri) return;

    let params = new URLSearchParams();
    params.set('error', 'user denied access');
    window.location.href = client.redirectUri + '?' + params.toString();
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

}
