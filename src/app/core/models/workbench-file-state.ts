import { SonifierFileState } from '../models/sonifier-file-state';
import { SourceExtractorFileState } from '../models/source-extractor-file-state';
import { ViewerFileState } from '../models/viewer-file-state';
import { PlotterFileState } from '../models/plotter-file-state';


export interface WorkbenchFileState {
  fileId: string,
  viewer: ViewerFileState;
  plotter: PlotterFileState;
  sonifier: SonifierFileState;
  sourceExtractor: SourceExtractorFileState;


  // markerEntities: {[id: string]: Marker};
  // markerIds: string[];
}