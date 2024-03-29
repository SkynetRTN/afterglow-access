import { Injectable } from '@angular/core';
import { Select, Store } from '@ngxs/store';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { Logout } from '../auth/auth.actions';
import { env } from '../../environments/environment';
import { Navigate } from '@ngxs/router-plugin';
import { AppState } from '../app.state';
import { AfterglowConfigService } from '../afterglow-config.service';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {
  constructor(private store: Store, private config: AfterglowConfigService) {}
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const idToken = localStorage.getItem('access_token');
    let req = request;
    if (this.config.authMethod == 'oauth2' && idToken) {
      req = request.clone({
        headers: request.headers.set('Authorization', 'Bearer ' + idToken),
      });
    }
    return next.handle(req).pipe(
      catchError((error) => {
        if (error instanceof HttpErrorResponse) {
          switch ((<HttpErrorResponse>error).status) {
            case 401: {
              //user authentication has expired

              this.store.dispatch([new Logout(), new Navigate(['/login'])]);
            }
          }
        }
        return throwError(error);
      })
    );
  }
}
