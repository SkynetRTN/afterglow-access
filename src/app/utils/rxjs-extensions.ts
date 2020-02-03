import { Observable, merge, empty, defer, throwError } from "rxjs";

import {
    tap,
    skip,
    takeUntil,
    flatMap,
    catchError,
    concat
  } from "rxjs/operators";

export function mergeDelayError(...sources: Observable<any>[]) {
    const errors = [];
    const catching = sources.map(obs => obs.pipe(catchError(e => {
      errors.push(e);
      return empty();
    })));
    return merge(...catching).pipe(
      concat(defer(
        () => errors.length === 0 ? empty() : throwError(errors))));
  }