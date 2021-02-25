import { Injectable } from "@angular/core";
import { Select, Store } from "@ngxs/store";
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse, HttpResponse } from "@angular/common/http";
import { Observable, throwError } from "rxjs";
import { map } from "rxjs/operators";
import * as camelCaseKeys from "camelcase-keys";
import * as snakeCaseKeys from "snakecase-keys";

function idToString(o: Object) {
  if (o && typeof o === "object") {
    Object.keys(o).forEach((k) => {
      if (o[k] !== null) {
        if (typeof o[k] === "object") {
          idToString(o[k]);
          return;
        }
        if (k == "id" || (k.endsWith("_id") && typeof o[k] === "number")) {
          o[k] = (o[k] as number).toString();
        } else if (k == "ids" || (k.endsWith("_ids") && Array.isArray(o[k]))) {
          o[k] = o[k].map((value) => (typeof o[k] === "number" ? (value as number).toString() : o[k]));
        }
      }
    });
  }
}

function idToNumber(o: Object) {
  if (o && typeof o === "object") {
    Object.keys(o).forEach((k) => {
      if (o[k] !== null) {
        if (typeof o[k] === "object") {
          idToNumber(o[k]);
          return;
        }
        if (k == "id" || (k.endsWith("Id") && typeof o[k] === "string")) {
          let parsed = parseInt(o[k])
          if(!isNaN(parsed)) {
            o[k] = parsed;
          }
        } else if (k == "ids" || (k.endsWith("Ids") && Array.isArray(o[k]))) {
          o[k] = o[k].map((value) => (typeof o[k] === "string" && !isNaN(parseInt(value)) ? parseInt(value) : o[k]));
        }
      }
    });
  }
}

@Injectable()
export class AfterglowCoreInterceptor implements HttpInterceptor {
  constructor(private store: Store) {}
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let requiresIntercept = req.responseType == "json";
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
          let body = camelCaseKeys(event.body, { deep: true });
          event = event.clone({ body: body });
        }
        return event;
      })
    );
  }
}
