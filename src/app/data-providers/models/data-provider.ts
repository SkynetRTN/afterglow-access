export interface DataProviderColumn {
  name: string;
  fieldName: string;
  sortable: boolean;
}

export interface DataProvider {
  id: string;
  name: string;
  displayName: string;
  icon: string;
  description: string;
  columns: Array<DataProviderColumn>;
  defaultSort: { field: string; direction: 'asc' | 'desc' | '' };
  sortBy: string;
  sortAsc: boolean;
  browseable: boolean;
  searchable: boolean;
  readonly: boolean;
  quota: number;
  usage: number;
}
