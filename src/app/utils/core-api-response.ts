export interface CoreApiResponse<T> {
  data: T;
  links: {
    pagination: PaginationLinks;
  };
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

export interface CoreApiError {
  error: {
    id: string;
    detail: string;
    status: string;
    meta: { [key: string]: any };
  };
}
