import { Injectable } from '@angular/core';
import { Select, Store } from '@ngxs/store';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { Logout } from './auth/auth.actions';


@Injectable()
export class TokenInterceptor implements HttpInterceptor {
  constructor(private store: Store) { }
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    request = request.clone({
      setHeaders: {
        'X-Requested-With': ''
      }
    });
    return next.handle(request)
    .pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse) {
          switch ((<HttpErrorResponse>error).status) {
            case 401: {
              this.store.dispatch(new Logout());
            }
          }
        }
        return Observable.throw(error);
      })
    )

  }
}