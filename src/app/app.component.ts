import { Component, OnInit, AfterViewInit, Renderer2, OnDestroy } from "@angular/core";
import { Select, Store } from "@ngxs/store";
import { Title } from "@angular/platform-browser";
import { Router, NavigationEnd, ActivatedRoute, RouterState } from "@angular/router";
import { Observable, Subscription, Subscribable, combineLatest } from "rxjs";

import { AuthState } from "./auth/auth.state";
import { InitAuth } from "./auth/auth.actions";
import { AuthGuard } from "./auth/services/auth-guard.service";
import { CoreUser } from "./auth/models/user";

import { HotkeysService, Hotkey } from "../../node_modules/angular2-hotkeys";
import { ThemeStorage, AfterglowTheme } from "./theme-picker/theme-storage/theme-storage";
import { DataProvider } from "./data-providers/models/data-provider";
import { HelpDialogComponent } from "./workbench/components/help-dialog/help-dialog.component";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";
import { ThemeDialogComponent } from "./workbench/components/theme-dialog/theme-dialog.component";
import { DataProvidersState } from "./data-providers/data-providers.state";
import { SetFullScreen, Initialize } from "./workbench/workbench.actions";
import { finalize, map, tap, filter, take } from "rxjs/operators";
import { Navigate } from "@ngxs/router-plugin";
import { WasmService } from "./wasm.service";
import { AppState } from './app.state';
import { LoadAfterglowConfig } from './app.actions';
// import * as FontFaceObserver from "fontfaceobserver"

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  currentRoutes: any[] = [];

  user$: Observable<CoreUser | null>;
  colorThemeName: string;
  fontSize: "default" | "large" | "largest";
  fontWeight: "default" | "bold" | "boldest";
  dataProviders$: Observable<Array<DataProvider>>;

  private hotKeys: Array<Hotkey> = [];
  private themeDialog: MatDialogRef<ThemeDialogComponent> | null = null;
  private helpDialog: MatDialogRef<HelpDialogComponent> | null = null;
  
  wasmReady$: Observable<boolean>;
  configReady$: Observable<boolean>;
  configError$: Observable<string>;
  ready$: Observable<boolean>;

  public constructor(
    private store: Store,
    private router: Router,
    private titleService: Title,
    private renderer: Renderer2,
    private themeStorage: ThemeStorage,
    public dialog: MatDialog,
    private _hotkeysService: HotkeysService,
    private wasmService: WasmService
  ) {
    this.user$ = this.store.select(AuthState.user);
    this.wasmReady$ = this.wasmService.wasmReady$;
    this.configReady$ = this.store.select(AppState.getConfigLoaded);
    this.configError$ = this.store.select(AppState.getConfigError);
    this.ready$ = combineLatest(this.configReady$, this.wasmReady$).pipe(
      map(([wasmReady, configReady]) => wasmReady && configReady),
    );

    this.store.dispatch(new LoadAfterglowConfig());

    //https://github.com/angular/components/issues/12171#issuecomment-546079738
    // const materialIcons = new FontFaceObserver('Material Icons');
    // materialIcons.load(null, 10000)
    //   .then(() => this.renderer.addClass(document.body, `material-icons-loaded`))
    //   .catch(() => this.renderer.addClass(document.body, `material-icons-error`)); // this line not necessary for simple example

    let theme = this.themeStorage.getCurrentTheme();
    if (!theme) {
      theme = {
        colorThemeName: this.themeStorage.colorThemes[0].name,
        fontSize: "default",
        fontWeight: "default",
      };
      this.themeStorage.storeTheme(theme);
    }
    this.colorThemeName = theme.colorThemeName;
    this.renderer.addClass(document.body, this.colorThemeName);
    this.fontSize = theme.fontSize;
    if (this.fontSize != "default") this.renderer.addClass(document.body, this.fontSize);
    this.fontWeight = theme.fontWeight;
    if (this.fontWeight != "default") this.renderer.addClass(document.body, this.fontWeight);

    this.themeStorage.onThemeUpdate.subscribe(this.onThemeUpdate.bind(this));
    //initialize theme
    this.onThemeUpdate(this.themeStorage.getCurrentTheme());
    this.dataProviders$ = this.store.select(DataProvidersState.getDataProviders);
    this.ready$
      .pipe(
        filter((v) => v === true),
        take(1)
      )
      .subscribe(() => {
        
        this.store.dispatch(new InitAuth());
        this.store.dispatch(new Initialize());
      });

    this.hotKeys.push(
      new Hotkey(
        "W",
        (event: KeyboardEvent): boolean => {
          this.store.dispatch(new Navigate(["workbench"]));
          this.store.dispatch(new SetFullScreen(false));
          return false; // Prevent bubbling
        },
        undefined,
        "Workbench"
      )
    );

   

    this.hotKeys.push(
      new Hotkey(
        "T",
        (event: KeyboardEvent): boolean => {
          if (this.themeDialog) return false;
          this.themeDialog = this.dialog.open(ThemeDialogComponent, {
            data: {},
            width: "500px",
            height: "400px",
          });
          this.themeDialog.afterClosed().subscribe((result) => {
            this.themeDialog = null;
          });
          return false; // Prevent bubbling
        },
        undefined,
        "Quick Start Guide"
      )
    );

    this.hotKeys.push(
      new Hotkey(
        "?",
        (event: KeyboardEvent): boolean => {
          if (this.helpDialog) return false;
          this.helpDialog = this.dialog.open(HelpDialogComponent, {
            data: {},
            width: "900px",
            height: "600px",
          });

          this.helpDialog.afterClosed().subscribe((result) => {
            this.helpDialog = null;
          });

          return false; // Prevent bubbling
        },
        undefined,
        "Quick Start Guide"
      )
    );

    this.hotKeys.forEach((hotKey) => this._hotkeysService.add(hotKey));
  }

  onThemeUpdate(theme: AfterglowTheme) {
    this.renderer.removeClass(document.body, this.colorThemeName);
    this.colorThemeName = theme.colorThemeName;
    this.renderer.addClass(document.body, this.colorThemeName);

    if (this.fontSize != "default") this.renderer.removeClass(document.body, this.fontSize);
    this.fontSize = theme.fontSize;
    if (this.fontSize != "default") this.renderer.addClass(document.body, this.fontSize);

    if (this.fontWeight != "default") this.renderer.removeClass(document.body, this.fontWeight);
    this.fontWeight = theme.fontWeight;
    if (this.fontWeight != "default") this.renderer.addClass(document.body, this.fontWeight);

    let colorTheme = this.themeStorage.getCurrentColorTheme();
  }

  getTitle(state: RouterState, parent: ActivatedRoute) {
    var data: any[] = [];
    if (parent && parent.snapshot.data && parent.snapshot.data.title) {
      data.push(parent.snapshot.data.title);
    }

    if (state && parent && parent.firstChild) {
      data.push(...this.getTitle(state, parent.firstChild));
    }
    return data;
  }

  ngOnInit() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        var title = [
          ...this.getTitle(this.router.routerState, this.router.routerState.root).reverse(),
          "Afterglow Access",
        ].join(" | ");
        this.titleService.setTitle(title);
      }
    });
  }

  ngAfterViewInit() {}

  ngOnDestroy() {
    this.hotKeys.forEach((hotKey) => this._hotkeysService.remove(hotKey));
  }
}
