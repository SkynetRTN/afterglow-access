"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
exports.__esModule = true;
exports.AuthState = void 0;
var store_1 = require("@ngxs/store");
var auth_actions_1 = require("./auth.actions");
var environment_1 = require("../../environments/environment");
var router_plugin_1 = require("@ngxs/router-plugin");
var AuthState = /** @class */ (function () {
    function AuthState(authService, router, location, urlSerializer, cookieService, authGuard) {
        this.authService = authService;
        this.router = router;
        this.location = location;
        this.urlSerializer = urlSerializer;
        this.cookieService = cookieService;
        this.authGuard = authGuard;
    }
    AuthState.state = function (state) {
        return state;
    };
    AuthState.loginPending = function (state) {
        return state.loginPending;
    };
    AuthState.loginError = function (state) {
        return state.loginError;
    };
    AuthState.user = function (state) {
        return state.user;
    };
    AuthState.authMethods = function (state) {
        return state.authMethods;
    };
    AuthState.permittedOAuthClientIds = function (state) {
        return state.permittedOAuthClientIds;
    };
    AuthState.loadingOAuthClients = function (state) {
        return state.loadingOAuthClients;
    };
    AuthState.oAuthClients = function (state) {
        return state.oAuthClients;
    };
    AuthState.loadingPermittedOAuthClientIds = function (state) {
        return state.loadingPermittedOAuthClientIds;
    };
    AuthState.prototype.init = function (ctx, action) {
        var _this = this;
        //redirect to authorizing page to get user info 
        //watch for localstorage changes
        window.addEventListener('storage', function (event) {
            if (['aa_user', 'aa_access_token'].includes(event.key)) {
                var state = ctx.getState();
                if (state.user && _this.authGuard.user) {
                    if (state.user.id != _this.authGuard.user.id) {
                        //local storage user does not match user in application state
                        ctx.dispatch(new auth_actions_1.ResetState());
                        ctx.patchState({
                            user: null
                        });
                        ctx.dispatch(new router_plugin_1.Navigate(['/login']));
                    }
                }
                else if (state.user) {
                    //user no longer exists in local storage/cookie
                    //login could be in-progress at the oauth authorized endpoint or the login endpoint of the app
                    console.log("LOGGIN OUT");
                    ctx.dispatch(new router_plugin_1.Navigate(['/logout']));
                }
                else {
                    //app state user is logged out
                    //local storage/cookie user is not null
                    ctx.dispatch(new auth_actions_1.LoginSuccess());
                }
            }
        });
    };
    AuthState.prototype.checkSession = function (ctx, action) {
    };
    AuthState.prototype.login = function (ctx, action) {
    };
    AuthState.prototype.loginSuccess = function (ctx, action) {
        if (this.authGuard.user) {
            var state = ctx.getState();
            if (state.user && this.authGuard.user.id != state.user.id) {
                //different user has logged in
                ctx.dispatch(new auth_actions_1.ResetState());
            }
            ctx.patchState({
                loginPending: false,
                loginError: '',
                user: this.authGuard.user
            });
            var nextUrl = localStorage.getItem("nextUrl");
            localStorage.removeItem("nextUrl");
            //if redirecting from oauth authorize page,  remove from navigation history so back button skips page
            ctx.dispatch(new router_plugin_1.Navigate([(nextUrl && nextUrl != "") ? nextUrl : "/"], {}, {
                replaceUrl: true
            }));
        }
        else {
            ctx.patchState({ loginPending: false, user: null, loginError: 'We encountered an unexpected error.  Please try again later.' });
        }
    };
    AuthState.prototype.logout = function (ctx, _a) {
        if (environment_1.appConfig.authMethod == 'cookie') {
            this.cookieService.remove(environment_1.appConfig.authCookieName);
        }
        else if (environment_1.appConfig.authMethod == 'oauth2') {
        }
        localStorage.removeItem('aa_user');
        localStorage.removeItem('aa_expires_at');
        localStorage.removeItem('aa_access_token');
        ctx.dispatch(new auth_actions_1.ResetState());
        ctx.patchState({ user: null });
    };
    __decorate([
        store_1.Action(auth_actions_1.InitAuth)
    ], AuthState.prototype, "init");
    __decorate([
        store_1.Action(auth_actions_1.CheckSession)
    ], AuthState.prototype, "checkSession");
    __decorate([
        store_1.Action(auth_actions_1.Login)
    ], AuthState.prototype, "login");
    __decorate([
        store_1.Action(auth_actions_1.LoginSuccess)
    ], AuthState.prototype, "loginSuccess");
    __decorate([
        store_1.Action(auth_actions_1.Logout)
    ], AuthState.prototype, "logout");
    __decorate([
        store_1.Selector()
    ], AuthState, "state");
    __decorate([
        store_1.Selector()
    ], AuthState, "loginPending");
    __decorate([
        store_1.Selector()
    ], AuthState, "loginError");
    __decorate([
        store_1.Selector()
    ], AuthState, "user");
    __decorate([
        store_1.Selector()
    ], AuthState, "authMethods");
    __decorate([
        store_1.Selector()
    ], AuthState, "permittedOAuthClientIds");
    __decorate([
        store_1.Selector()
    ], AuthState, "loadingOAuthClients");
    __decorate([
        store_1.Selector()
    ], AuthState, "oAuthClients");
    __decorate([
        store_1.Selector()
    ], AuthState, "loadingPermittedOAuthClientIds");
    AuthState = __decorate([
        store_1.State({
            name: 'auth',
            defaults: {
                loginPending: false,
                loginError: '',
                user: null,
                loadingOAuthClients: false,
                loadingPermittedOAuthClientIds: false,
                permittedOAuthClientIds: [],
                oAuthClients: [],
                authMethods: []
            }
        })
    ], AuthState);
    return AuthState;
}());
exports.AuthState = AuthState;
