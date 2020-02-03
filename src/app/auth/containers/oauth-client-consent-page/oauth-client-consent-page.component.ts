import { Component, OnInit, OnDestroy, AfterViewInit } from "@angular/core";
import { Select, Store } from '@ngxs/store';
import { Router } from "@angular/router";
import { Observable, Subscription, combineLatest} from "rxjs";
import { filter, map, withLatestFrom } from "rxjs/operators";
import { ActivatedRoute } from "@angular/router";
import { OAuthClient } from "../../models/oauth-client";
import { LoadPermittedOAuthClients, LoadOAuthClients, AddPermittedOAuthClient } from '../../auth.actions';
import { AuthState } from '../../auth.state';

@Component({
  selector: "app-oauth-client-consent-page",
  templateUrl: "./oauth-client-consent-page.component.html",
  styleUrls: ["./oauth-client-consent-page.component.css"]
})
export class OauthClientConsentPageComponent implements OnInit, AfterViewInit {
  sub: Subscription;

  @Select(AuthState.permittedOAuthClientIds)
  permittedClientIds$: Observable<string[]>;

  @Select(AuthState.oAuthClients)
  oAuthClients$: Observable<OAuthClient[]>;

  @Select(AuthState.loadingOAuthClients)
  loadingOAuthClients$: Observable<boolean>;

  @Select(AuthState.loadingPermittedOAuthClientIds)
  loadingPermittedOAuthClientIds$: Observable<boolean>;

  oAuthClient$: Observable<OAuthClient>;
  loading$: Observable<boolean>;
  consented$: Observable<boolean>;
  next$: Observable<string>;

  constructor(
    private store: Store,
    private activatedRoute: ActivatedRoute,
    private router: Router
  ) {
    this.store.dispatch(new LoadPermittedOAuthClients());
    this.store.dispatch(new LoadOAuthClients());

    this.oAuthClient$ = combineLatest(
      this.activatedRoute.queryParams,
      this.oAuthClients$
    ).pipe(
      map(([queryParams, clients]) => {
        if (!queryParams["client_id"]) return null;
        let client = clients.find(
          client => client.clientId == queryParams["client_id"]
        );
        if (!client) return null;
        return client;
      }),
      filter(client => client !== null)
    );

    this.next$ = this.activatedRoute.queryParams.pipe(
      map(queryParams => {
        if (!queryParams["next"]) return null;
        return queryParams["next"];
      }),
      filter(next => next !== null)
    );

    this.consented$ = combineLatest(
      this.oAuthClient$,
      this.permittedClientIds$
    ).pipe(
      map(([client, permittedClients]) => {
        return (
          client &&
          permittedClients.find(
            permittedClientId => permittedClientId == client.clientId
          ) !== undefined
        );
      })
    );

    this.sub = this.consented$
    .pipe(
      withLatestFrom(this.oAuthClient$, this.next$)
    )
      
      .subscribe(([consented, client, next]) => {
        if (!consented || !next) return;

        window.location.href = next;
      });

    this.loading$ = combineLatest(
      this.loadingOAuthClients$,
      this.loadingPermittedOAuthClientIds$,
      this.consented$
    ).pipe(
      map(([loadingClients, loadingPermittedClientIds, consented]) => {
      return loadingClients || loadingPermittedClientIds || consented;
    }));
  }

  ngOnInit() {}

  ngAfterViewInit() {}

  addPermittedOAuthClient(client: OAuthClient) {
    this.store.dispatch(
      new AddPermittedOAuthClient(client)
    );
  }

  onCancelClick(client: OAuthClient) {
    if (!client || !client.redirectUri) return;

    let params = new URLSearchParams();
    params.set("error", "user denied access");
    window.location.href = client.redirectUri + "?" + params.toString();
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
