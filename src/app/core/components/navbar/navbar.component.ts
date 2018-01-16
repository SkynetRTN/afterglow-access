import { Component, Input, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { MenuType } from './navbar.metadata'

@Component({
  selector: 'navbar',
  templateUrl: 'navbar.component.html',
  styleUrls: [ 'navbar.component.css' ]
})
export class NavbarComponent {
  @Input() routes: any[];

  private router: Router;
  isCollapsed = true;

  constructor(router: Router) {
    this.router = router;
    
  }

  public get brandMenuItems() {
    return this.routes.filter(menuItem => menuItem.menuType == MenuType.BRAND);
  }

  public get leftMenuItems() {
    return this.routes.filter(menuItem => menuItem.menuType == MenuType.LEFT);
  }

  public get rightMenuItems() {
    return this.routes.filter(menuItem => menuItem.menuType == MenuType.RIGHT);
  }

  public get menuIcon(): string {
    return this.isCollapsed ? '☰' : '✖';
  }

}
