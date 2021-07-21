export interface CoreApiResponse {
  data: any;
  links: any;
}

export interface PaginationLinks {
  currentPage: number;
  first: string;
  last: string;
  next: string;
  prev: string;
  totalPages: number;
  sort: string;
  pageSize: number;
}
