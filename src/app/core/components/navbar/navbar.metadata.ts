export enum MenuType {
  BRAND,
  LEFT,
  RIGHT,
  HIDDEN,
}

export interface RouteInfo {
  path: string;
  title: string;
  menuType: MenuType;
}
