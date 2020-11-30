import { Component, OnInit, OnDestroy } from "@angular/core";
import { Select, Store } from "@ngxs/store";
import { Router } from "@angular/router";
import { ActivatedRoute } from "@angular/router";
import { Subscription } from "rxjs";
import { GetOAuthToken, LoginSuccess, CheckSession } from "../../auth.actions";
import { Navigate } from "@ngxs/router-plugin";

import * as moment from "moment";
import * as qs from "query-string";
import { HttpParams } from "@angular/common/http";
import { AuthService } from "../../services/auth.service";
import { appConfig } from "../../../../environments/environment";
import { CookieService } from "ngx-cookie";

@Component({
  selector: "app-authorized-page",
  templateUrl: "./authorized-page.component.html",
  styleUrls: ["./authorized-page.component.css"],
})
export class AuthorizedPageComponent implements OnInit, OnDestroy {
  private sub: Subscription;

  constructor(
    private store: Store,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private cookieService: CookieService
  ) {}

  ngOnInit() {
    if (appConfig.authMethod == "cookie") {
      if (this.cookieService.get(appConfig.authCookieName)) {
        //
        this.authService.getUser().subscribe(
          (user) => {
            localStorage.setItem("aa_user", JSON.stringify(user));
            localStorage.setItem("aa_access_token", this.cookieService.get(appConfig.authCookieName));
            this.store.dispatch(new LoginSuccess());
          },
          (error) => {
            //this.cookieService.remove(appConfig.authCookieName);
          }
        );
      }
    } else {
      this.sub = this.activatedRoute.fragment.subscribe((fragment) => {
        let params = qs.parse(fragment);

        let nonce = localStorage.getItem("aa_oauth_nonce");
        if (nonce !== null && params["access_token"] && params["expires_in"] && params["state"]) {
          let state = JSON.parse(params["state"] as string);
          if (state["nonce"] && state["nonce"] == nonce) {
            let expiresIn = parseInt(params["expires_in"] as string);
            localStorage.setItem("aa_access_token", params["access_token"] as string);
            localStorage.setItem("aa_expires_at", moment().add(expiresIn, "seconds").toJSON());

            //get user
            this.authService.getUser().subscribe(
              (user) => {
                localStorage.setItem("aa_user", JSON.stringify(user));
                this.store.dispatch(new LoginSuccess());
              },
              (error) => {
                localStorage.removeItem("aa_access_token");
                localStorage.removeItem("aa_expires_at");
              }
            );
          }
        } else {
        }
        localStorage.removeItem("aa_oauth_nonce");
      });
    }
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
  }
}
