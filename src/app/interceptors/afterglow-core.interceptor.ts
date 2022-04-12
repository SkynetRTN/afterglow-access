import { Injectable } from '@angular/core';
import { Select, Store } from '@ngxs/store';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
  HttpResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import * as camelCaseKeys from 'camelcase-keys';
import * as snakeCaseKeys from 'snakecase-keys';
import { _isNumberValue } from '@angular/cdk/coercion';
import { isNumber } from '../utils/validators';
import { idToNumber, idToString } from '../pipes/core-case.pipe';



@Injectable()
export class AfterglowCoreInterceptor implements HttpInterceptor {
  constructor(private store: Store) { }
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let requiresIntercept = req.responseType == 'json';
    if (requiresIntercept && req.body && !(req.body instanceof FormData)) {
      idToNumber(req.body);
      let body = snakeCaseKeys(req.body, { deep: true });
      req = req.clone({
        body: body,
      });
    }

    return next.handle(req).pipe(
      map((event) => {
        if (requiresIntercept && event instanceof HttpResponse && event.body) {
          idToString(event.body);
          let body = camelCaseKeys(event.body, { deep: true, exclude: ['Open', 'U', 'B', 'V', 'R', 'I', 'Open', 'G', 'J', 'H', 'K', 'L', 'M', 'Rc', 'Ic', 'Su', 'Sv'] });
          event = event.clone({ body: body });
        }
        return event;
      })
    );
  }
}
