export interface DataProviderColumn {
  name: string;
  fieldName: string;
  sortable: boolean;
}

export interface DataProvider {
    id: string;
    name: string;
    icon: string;
    description: string;
    columns: Array<DataProviderColumn>;
    sortBy: string;
    sortAsc: boolean;
    browseable: boolean;
    searchable: boolean;
    readonly: boolean;
    quota: number;
    usage: number
}