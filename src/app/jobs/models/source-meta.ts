export interface SourceMeta {
  fileId: string;
  time: Date | string | null;
  filter: string | null;
  telescope: string | null;
  expLength: number | null;
}
