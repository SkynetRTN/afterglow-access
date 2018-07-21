import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import * as fromRoot from './reducers';
import * as authActions from './auth/actions/auth';


@Injectable()
export class TokenInterceptor implements HttpInterceptor {
  constructor(private store: Store<fromRoot.State>) { }
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    request = request.clone({
      setHeaders: {
        'X-Requested-With': ''
      }
    });
    return next.handle(request)
      .catch(error => {
        if (error instanceof HttpErrorResponse) {
          switch ((<HttpErrorResponse>error).status) {
            case 401: {
              this.store.dispatch(new authActions.Logout());
            }
          }
        }
        return Observable.throw(error);
      });

  }
}