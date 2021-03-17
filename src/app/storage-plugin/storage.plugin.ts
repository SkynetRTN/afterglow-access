import { PLATFORM_ID, Inject, Injectable } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { NgxsPlugin, setValue, getValue, InitState, UpdateState, actionMatcher, NgxsNextPluginFn } from '@ngxs/store';
import { debounceTime, takeUntil, tap, throttleTime } from 'rxjs/operators';

import { StorageEngine, NgxsStoragePluginOptions, STORAGE_ENGINE, NGXS_STORAGE_PLUGIN_OPTIONS } from './symbols';
import { DEFAULT_STATE_KEY } from './internals';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class AfterglowStoragePlugin implements NgxsPlugin {
  stateWriter: Subject<any> = new Subject();

  constructor(
    @Inject(NGXS_STORAGE_PLUGIN_OPTIONS) private _options: NgxsStoragePluginOptions,
    @Inject(STORAGE_ENGINE) private _engine: StorageEngine,
    @Inject(PLATFORM_ID) private _platformId: string
  ) {
    this.stateWriter.pipe(debounceTime(1000)).subscribe((nextState) => {
      const keys = this._options.key as string[];
      for (const key of keys) {
        let val = nextState;

        if (key !== DEFAULT_STATE_KEY) {
          val = getValue(nextState, key!);

          if (this._options.sanitizations) {
            this._options.sanitizations
              .filter((s) => s.key === key)
              .forEach((s) => {
                val = s.sanitize(val);
              });
          }
        }

        try {
          this._engine.setItem(key!, this._options.serialize!(val));
        } catch (e) {
          console.error('Error ocurred while serializing the store value, value not updated.');
        }
      }
    });
  }

  handle(state: any, event: any, next: NgxsNextPluginFn) {
    if (isPlatformServer(this._platformId) && this._engine === null) {
      return next(state, event);
    }

    // We cast to `string[]` here as we're sure that this option has been
    // transformed by the `storageOptionsFactory` function that provided token
    const keys = this._options.key as string[];
    const matches = actionMatcher(event);
    const isInitAction = matches(InitState) || matches(UpdateState);
    let hasMigration = false;

    if (isInitAction) {
      for (const key of keys) {
        const isMaster = key === DEFAULT_STATE_KEY;
        let val: any = this._engine.getItem(key!);

        if (val !== 'undefined' && typeof val !== 'undefined' && val !== null) {
          try {
            val = this._options.deserialize!(val);
          } catch (e) {
            console.error('Error ocurred while deserializing the store value, falling back to empty object.');
            val = {};
          }

          if (val.version && getValue(state, key + '.version') && val.version != getValue(state, key + '.version')) {
            //for now, clear state if version mismatch
            console.log('Mismatch in version found in session storage: ', key);
            val = getValue(state, key);
            hasMigration = true;
          }

          if (JSON.stringify(Object.keys(val)) != JSON.stringify(Object.keys(getValue(state, key)))) {
            //for now, clear state if object keys do not match
            console.warn('Mismatch in object keys found in session storage: ', key);
            val = getValue(state, key);
            hasMigration = true;
          }

          // if (this._options.migrations) {
          //   this._options.migrations.forEach(strategy => {
          //     const versionMatch =
          //       strategy.version === getValue(val, strategy.versionKey || 'version');
          //     const keyMatch = (!strategy.key && isMaster) || strategy.key === key;
          //     if (versionMatch && keyMatch) {
          //       val = strategy.migrate(val);
          //       hasMigration = true;
          //     }
          //   });
          // }

          if (!isMaster) {
            state = setValue(state, key!, val);
          } else {
            state = { ...state, ...val };
          }
        }
      }
    }

    return next(state, event).pipe(
      tap((nextState) => {
        if (!isInitAction || (isInitAction && hasMigration)) {
          this.stateWriter.next(nextState);
        }
      })
    );
  }
}
