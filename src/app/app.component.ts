import { Component, OnInit, AfterViewInit, Renderer2, OnDestroy } from "@angular/core";
import { Select, Store } from '@ngxs/store';
import { Title } from "@angular/platform-browser";
import { Router, NavigationEnd, ActivatedRoute } from "@angular/router";
import { Observable, Subscription, Subscribable } from "rxjs";

import { AuthState } from './auth/auth.state';
import { InitAuth } from './auth/auth.actions';
import { AuthGuard } from "./auth/services/auth-guard.service";
import { CoreUser } from "./auth/models/user";

import { HotkeysService, Hotkey } from "../../node_modules/angular2-hotkeys";
import { ThemeStorage } from "./theme-picker/theme-storage/theme-storage";
import { DataProvider } from "./data-providers/models/data-provider";
import { HelpDialogComponent } from "./core/components/help-dialog/help-dialog.component";
import { MatDialog, MatDialogRef } from "@angular/material";
import { ThemeDialogComponent } from "./core/components/theme-dialog/theme-dialog.component";
import { DataProvidersState } from './data-providers/data-providers.state';
import { SetFullScreen, Initialize } from './core/workbench.actions';
import { finalize } from 'rxjs/operators';
import { Navigate } from '@ngxs/router-plugin';



@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"]
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  currentRoutes: any[] = [];

  @Select(AuthState.user)
  user$: Observable<CoreUser>


  loggedInSub: Subscription;
  colorThemeName: string;
  fontSize: "default" | "large" | "largest";
  fontWeight: "default" | "bold" | "boldest";
  dataProviders$: Observable<Array<DataProvider>>;

  private hotKeys: Array<Hotkey> = [];
  private themeDialog: MatDialogRef<ThemeDialogComponent>;
  private helpDialog: MatDialogRef<HelpDialogComponent>;

  public constructor(
    private store: Store,
    private authGuard: AuthGuard,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private titleService: Title,
    private renderer: Renderer2,
    private themeStorage: ThemeStorage,
    public dialog: MatDialog,
    private _hotkeysService: HotkeysService

  ) {
    let theme = this.themeStorage.getCurrentTheme();
    if (!theme) {
      theme = {
        colorThemeName: this.themeStorage.colorThemes[0].name,
        fontSize: "default",
        fontWeight: "default"
      };
      this.themeStorage.storeTheme(theme);
    }
    this.colorThemeName = theme.colorThemeName;
    this.renderer.addClass(document.body, this.colorThemeName);
    this.fontSize = theme.fontSize;
    if (this.fontSize != "default")
      this.renderer.addClass(document.body, this.fontSize);
    this.fontWeight = theme.fontWeight;
    if (this.fontWeight != "default")
      this.renderer.addClass(document.body, this.fontWeight);

    this.themeStorage.onThemeUpdate.subscribe(theme => {
      this.renderer.removeClass(document.body, this.colorThemeName);
      this.colorThemeName = theme.colorThemeName;
      this.renderer.addClass(document.body, this.colorThemeName);

      if (this.fontSize != "default")
        this.renderer.removeClass(document.body, this.fontSize);
      this.fontSize = theme.fontSize;
      if (this.fontSize != "default")
        this.renderer.addClass(document.body, this.fontSize);

      if (this.fontWeight != "default")
        this.renderer.removeClass(document.body, this.fontWeight);
      this.fontWeight = theme.fontWeight;
      if (this.fontWeight != "default")
        this.renderer.addClass(document.body, this.fontWeight);
    });

    this.dataProviders$ = this.store.select(DataProvidersState.getDataProviders);

    this.store.dispatch(new InitAuth());

    this.hotKeys.push(
      new Hotkey(
        "W",
        (event: KeyboardEvent): boolean => {
          this.store.dispatch(new Navigate(["workbench"]));
          this.store.dispatch(new SetFullScreen(false))
          return false; // Prevent bubbling
        },
        undefined,
        "Workbench"
      )
    );

    this.hotKeys.push(
      new Hotkey(
        "D",
        (event: KeyboardEvent): boolean => {
          this.store.dispatch(new Navigate(["data-providers"]));
          return false; // Prevent bubbling
        },
        undefined,
        "Data Providers"
      )
    );

    this.hotKeys.push(
      new Hotkey(
        "T",
        (event: KeyboardEvent): boolean => {
          if(this.themeDialog) return;
          this.themeDialog = this.dialog.open(ThemeDialogComponent, {
            data: {},
            width: "500px",
            height: "400px"
          });
          this.themeDialog.afterClosed().subscribe(result => {
            this.themeDialog = undefined;
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
          if(this.helpDialog) return;
          this.helpDialog = this.dialog.open(HelpDialogComponent, {
            data: {},
            width: "800px",
            height: "600px"
          });

          this.helpDialog.afterClosed().subscribe(result => {
            this.helpDialog = undefined;
          });

          return false; // Prevent bubbling
        },
        undefined,
        "Quick Start Guide"
      )
    );

    
    this.hotKeys.forEach(hotKey => this._hotkeysService.add(hotKey));

    // localStorage.setItem("previouslyVisited", "false");
    // this.tourService.events$.subscribe(x => console.log(x));
    // this.tourService.initialize(
    //   [
    //     {
    //       anchorId: "primary navigation",
    //       content:
    //         "This is Afterglow's main navigation menu.  You are currently viewing the Workbench.  Click the next button below or press the right arrow key on your keyboard to continue.",
    //       title: "Navigation Menu",
    //       route: "/workbench"
    //     },
    //     {
    //       anchorId: "workbench nav link",
    //       content:
    //         "The workbench is where you will find tools for analyzing and manipulating your image data. You can adjust the appearance of the image, make plots, measure objects, sonify, and much more.",
    //       title: "Workbench",
    //       route: "/workbench"
    //     },
    //     {
    //       anchorId: "data providers nav link",
    //       content:
    //         "Before you can use the workbench tools,  you need to import image files into your Afterglow library.  This is done on the data providers page.  For this tour,  we will automatically import an image from a data provider for you.  After the tour,  come back to this page using the main navigation menu if you want to import additional images from other data providers.",
    //       title: "Data Providers",
    //       route: "/data-providers"
    //     },
    //     {
    //       anchorId: "tour nav link",
    //       content:
    //         "As a reminder, you can access this tour at any time in the future by clicking this help button.  Click next to learn more about the workbench.",
    //       title: "Tour",
    //       route: "/workbench"
    //     },
    //     {
    //       anchorId: "file library",
    //       content:
    //         "The panel on the left side of the screen allows you to manage all of the files you have imported into your library.  You can select, search, and delete files from this panel.",
    //       title: "File Library",
    //       route: "/workbench"
    //     },
    //     {
    //       anchorId: "file libary show/hide",
    //       content:
    //         "You can hide the file library by clicking this file icon.  Simply click the icon a second time to make it visible again.",
    //       title: "Hide File Library",
    //       route: "/workbench"
    //     },

    //     {
    //       anchorId: "display settings",
    //       content:
    //         "The panel on the right side of the screen is where you will find all of the processing and analysis tools.  You are currently viewing the display settings.  This is where you can change how the image is displayed on the screen by adjusting the orientation, color mapping, scaling, and more.",
    //       title: "Display Settings",
    //       route: "/workbench/viewer"
    //     },
    //     {
    //       anchorId: "marker settings",
    //       content:
    //         "This is where you can add custom markers to your image.  This is great for identifying known targets, making a finding chart, or for adding labels to your image.",
    //       title: "Custom Markers",
    //       route: "/workbench/markers"
    //     },
    //     {
    //       anchorId: "plotter settings",
    //       content:
    //         "The plotter tool is useful for plotting the cross sections through or the separation between sources in your image.  To plot,  simply click once in your image to set the starting point and click again to set the ending point.",
    //       title: "Plotter",
    //       route: "/workbench/plotter"
    //     },
    //     {
    //       anchorId: "sonifier settings",
    //       content:
    //         "The sonification tool converts the pixel data in to sound.",
    //       title: "Sonifier",
    //       route: "/workbench/sonifier"
    //     },
    //     {
    //       anchorId: "source extraction settings",
    //       content:
    //         "The source extraction tool allows you to identify sources in your image files through manual clicking or through automatic extraction.  Once they've been identified,  you can photometer them in one or more of your image files and download the results.",
    //       title: "Source Extraction",
    //       route: "/workbench/source-extractor"
    //     },
    //     {
    //       anchorId: "display settings",
    //       content:
    //         "Similar to the file library panel,  you can hide the workbench tools panel by clicking the icon next to the active tool.  Clicking it a second time will make it visible again.",
    //       title: "Hide Workbench Tools",
    //       route: "/workbench/viewer"
    //     },

    //   ],
    //   {
    //     popperSettings: {
    //       closeOnClickOutside: false,
    //       hideOnClickOutside: false
    //     }
    //   }
    // );

    // this.loggedInSub = this.loggedIn$.subscribe(loggedIn => {
    //   this.currentRoutes = routes.filter(route => route.menuType == MenuType.BRAND || (('canActivate' in route) == loggedIn));
    // })
  }

  getTitle(state, parent) {
    var data = [];
    if (parent && parent.snapshot.data && parent.snapshot.data.title) {
      data.push(parent.snapshot.data.title);
    }

    if (state && parent) {
      data.push(...this.getTitle(state, state.firstChild(parent)));
    }
    return data;
  }

  ngOnInit() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        var title = [
          ...this.getTitle(
            this.router.routerState,
            this.router.routerState.root
          ).reverse(),
          "Afterglow Access"
        ].join(" | ");
        this.titleService.setTitle(title);
      }
    });

    this.store.dispatch(new Initialize());
  }

  ngAfterViewInit() {}

  
  ngOnDestroy() {
    this.hotKeys.forEach(hotKey => this._hotkeysService.remove(hotKey));
  }

}
