import { State, Action, Selector, StateContext, Store, Actions, ofActionDispatched } from '@ngxs/store';
import { merge } from "rxjs";
import { flatMap, filter } from 'rxjs/operators';
import { Point, Matrix, Rectangle } from 'paper';
import { RenormalizeImageFile, NormalizeImageTile, UpdateNormalizer, AddRegionToHistory, SetRegionMode, UpdateSonifierRegion, UndoRegionSelection, RedoRegionSelection, CenterRegionInViewport, UpdateSonificationUri, ExtractSources, ExtractSourcesFail, UpdateSourceExtractorRegion, SetSourceExtractorRegion, UpdateSourceExtractorFileState, ResetImageTransform, SetViewportTransform, ZoomTo, ZoomBy, UpdateCurrentViewportSize, SetImageTransform, MoveBy, InitializeImageFileState, RotateBy, Flip, StartLine, UpdateLine, UpdatePlotterFileState, UpdateSonifierFileState, ClearRegionHistory, SetProgressLine } from './image-files.actions';
import { ImageFileState } from './models/image-file-state';
import { LoadLibrarySuccess, RemoveDataFileSuccess, InitImageTiles, LoadDataFileHdrSuccess } from '../data-files/data-files.actions';
import { ImmutableContext } from '@ngxs-labs/immer-adapter';
import { DataFileType } from '../data-files/models/data-file-type';
import { grayColorMap } from './models/color-map';
import { StretchMode } from './models/stretch-mode';
import { SonifierRegionMode } from './models/sonifier-file-state';
import { SourceExtractorRegionOption } from './models/source-extractor-file-state';
import { ImageTile } from '../data-files/models/image-tile';
import { getYTileDim, getHeight, getXTileDim, getWidth, ImageFile } from '../data-files/models/data-file';
import { DataFilesState } from '../data-files/data-files.state';
import { normalize } from './models/pixel-normalizer';
import { AfterglowDataFileService } from './services/afterglow-data-files';
import { SourceExtractionJob, SourceExtractionJobResult } from '../jobs/models/source-extraction';
import { JobType } from '../jobs/models/job-types';
import { CorrelationIdGenerator } from '../utils/correlated-action';
import { CreateJob, CreateJobFail } from '../jobs/jobs.actions';
import { JobActionHandler } from '../jobs/lib/job-action-handler';
import { PosType, Source } from './models/source';
import { getViewportRegion, getScale } from './models/transformation';
import { AddSources } from './sources.actions';

export interface ImageFilesStateModel {
  ids: string[];
  entities: { [id: string]: ImageFileState };
}

@State<ImageFilesStateModel>({
  name: 'imageFiles',
  defaults: {
    ids: [],
    entities: {}
  }
})
export class ImageFilesState {

  constructor(private store: Store, private afterglowDataFileService: AfterglowDataFileService, private correlationIdGenerator: CorrelationIdGenerator, private actions$: Actions) { }

  @Selector()
  public static getState(state: ImageFilesStateModel) {
    return state;
  }

  @Selector()
  public static getEntities(state: ImageFilesStateModel) {
    return state.entities;
  }

  @Selector()
  public static getIds(state: ImageFilesStateModel) {
    return state.ids;
  }

  @Selector()
  public static getImageFileStates(state: ImageFilesStateModel) {
    return Object.values(state.entities);
  }

  @Action(InitializeImageFileState)
  @ImmutableContext()
  public initializeImageFileState({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileIds }: InitializeImageFileState) {
    setState((state: ImageFilesStateModel) => {
      fileIds.forEach(fileId => {
        state.entities[fileId] = {
          imageFileId: fileId,
          normalization: {
            normalizedTiles: null,
            initialized: false,
            normalizer: {
              backgroundPercentile: 10,
              peakPercentile: 99,
              colorMap: grayColorMap,
              stretchMode: StretchMode.Linear,
              inverted: false
            }
          },
          transformation: {
            imageTransform: null,
            viewportTransform: null,
            imageToViewportTransform: null,
            viewportSize: null
          },
          plotter: {
            measuring: false,
            lineMeasureStart: null,
            lineMeasureEnd: null,
          },
          sonifier: {
            sonificationUri: null,
            region: null,
            regionHistory: [],
            regionHistoryIndex: null,
            regionHistoryInitialized: false,
            regionMode: SonifierRegionMode.VIEWPORT,
            viewportSync: true,
            duration: 10,
            toneCount: 22,
            progressLine: null,
          },
          sourceExtractor: {
            regionOption: SourceExtractorRegionOption.VIEWPORT,
            region: null,
            selectedSourceIds: [],
            sourceExtractionJobId: null,
          },
          markers: []
        }

        state.ids.push(fileId);

      });
      return state;
    })
  }

  @Action(RemoveDataFileSuccess)
  @ImmutableContext()
  public removeDataFileSuccess({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId }: RemoveDataFileSuccess) {
    setState((state: ImageFilesStateModel) => {
      state.ids = state.ids.filter(id => id != fileId);
      if (fileId in state.entities) delete state.entities[fileId];
      return state;
    });
  }

  @Action(InitImageTiles)
  @ImmutableContext()
  public initImageTiles({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId }: InitImageTiles) {
    setState((state: ImageFilesStateModel) => {
      let normalization = state.entities[fileId].normalization;
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let tiles: ImageTile[] = [];

      for (let j = 0; j < getYTileDim(imageFile); j += 1) {
        let tw = imageFile.tileWidth;
        let th = imageFile.tileHeight;

        if (j === getYTileDim(imageFile) - 1) {
          th -= (j + 1) * imageFile.tileHeight - getHeight(imageFile);
        }
        for (let i = 0; i < getXTileDim(imageFile); i += 1) {
          if (i === getXTileDim(imageFile) - 1) {
            tw -= (i + 1) * imageFile.tileWidth - getWidth(imageFile);
          }
          tiles.push({
            index: j * getXTileDim(imageFile) + i,
            x: i * tw,
            y: j * th,
            width: tw,
            height: th,
            pixelsLoaded: false,
            pixelsLoading: false,
            pixelLoadingFailed: false,
            pixels: null
          });
        }
      }
      normalization.normalizedTiles = tiles;

      // also initialize the transformation matrix since it requires the 
      // image height
      let transformation = state.entities[fileId].transformation;
      transformation.imageTransform = new Matrix(1, 0, 0, -1, 0, getHeight(imageFile));
      transformation.viewportTransform = new Matrix(1, 0, 0, 1, 0, 0);

      transformation.imageToViewportTransform = transformation.viewportTransform.appended(transformation.imageTransform);
      return state;
    });
  }


  @Action(RenormalizeImageFile)
  @ImmutableContext()
  public renormalizeImageFile({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId }: RenormalizeImageFile) {
    setState((state: ImageFilesStateModel) => {
      let normalization = state.entities[fileId].normalization;
      normalization.normalizedTiles.forEach(tile => {
        tile.pixelsLoaded = false;
        tile.pixelsLoading = false;
        tile.pixels = null;
      })
      return state;
    });
  }

  @Action(NormalizeImageTile)
  @ImmutableContext()
  public normalizeImageTile({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, tileIndex }: NormalizeImageTile) {
    setState((state: ImageFilesStateModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let normalization = state.entities[fileId].normalization;
      let tile = normalization.normalizedTiles[tileIndex];
      tile.pixelsLoaded = true;
      tile.pixelsLoading = false;
      tile.pixels = normalize(imageFile.tiles[tileIndex].pixels, imageFile.hist, normalization.normalizer);

      return state;
    });
  }

  @Action(UpdateNormalizer)
  @ImmutableContext()
  public updateNormalizer({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, changes }: UpdateNormalizer) {
    setState((state: ImageFilesStateModel) => {
      let normalizer = state.entities[fileId].normalization.normalizer;
      state.entities[fileId].normalization.normalizer = {
        ...normalizer,
        ...changes
      }
      return state;
    });

    return dispatch(new RenormalizeImageFile(fileId))
  }


  /*Sonification*/
  @Action(LoadDataFileHdrSuccess)
  @ImmutableContext()
  public loadDataFileHdrSuccess({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, header }: LoadDataFileHdrSuccess) {
    let state = getState();
    let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
    let dataFile = dataFiles[fileId];
    let result = [];

    if (dataFile.type == DataFileType.IMAGE) {
      let sonifierState = state.entities[dataFile.id].sonifier;
      let sourceExtractorState = state.entities[dataFile.id].sourceExtractor;
      //add effects for image file selection
      let imageFile = dataFile as ImageFile;
      dispatch(new InitImageTiles(fileId));

      if (sonifierState.regionHistoryInitialized) {
        dispatch(new AddRegionToHistory(
          imageFile.id,
          {
            x: 0,
            y: 0,
            width: getWidth(imageFile),
            height: getHeight(imageFile)
          }
        ))
      }

    }

  }

  @Action(SetRegionMode)
  @ImmutableContext()
  public setRegionMode({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, mode }: SetRegionMode) {
    setState((state: ImageFilesStateModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      state.entities[fileId].sonifier.regionMode = mode;
      return state;
    });

    dispatch(new UpdateSonifierRegion(fileId));
  }

  @Action([AddRegionToHistory, UndoRegionSelection, RedoRegionSelection])
  @ImmutableContext()
  public regionHistoryChanged({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId }: AddRegionToHistory | UndoRegionSelection | RedoRegionSelection) {
    let state = getState();
    if (state.entities[fileId].sonifier.regionMode == SonifierRegionMode.CUSTOM) {
      dispatch(new UpdateSonifierRegion(fileId));
    }
  }

  @Action(UpdateSonifierRegion)
  @ImmutableContext()
  public updateSonifierRegion({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId }: UpdateSonifierRegion) {
    setState((state: ImageFilesStateModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let sonifierState = state.entities[fileId].sonifier;
      let transformationState = state.entities[fileId].transformation;
      let sourceExtractorState = state.entities[fileId].sourceExtractor;

      if (
        sonifierState.regionMode == SonifierRegionMode.CUSTOM &&
        sonifierState.viewportSync &&
        sonifierState.region
      ) {
        dispatch(
          new CenterRegionInViewport(
            fileId,
            sonifierState.region,
            transformationState.viewportSize)
        );
      }

      if (
        sourceExtractorState.regionOption ==
        SourceExtractorRegionOption.SONIFIER_REGION
      )
        dispatch(
          new UpdateSourceExtractorRegion(fileId)
        );


      if (sonifierState.regionMode == SonifierRegionMode.VIEWPORT) {
        sonifierState.region = getViewportRegion(state.entities[fileId].transformation, imageFile);
      }
      else if (sonifierState.regionMode == SonifierRegionMode.CUSTOM) {
        if (sonifierState.regionHistoryIndex < sonifierState.regionHistory.length) {
          sonifierState.region = sonifierState.regionHistory[sonifierState.regionHistoryIndex];
        }
      }


      return state;
    });

  }

  @Action(AddRegionToHistory)
  @ImmutableContext()
  public addRegionToHistory({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, region }: AddRegionToHistory) {
    setState((state: ImageFilesStateModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let sonifierState = state.entities[fileId].sonifier;
      if (!sonifierState.regionHistoryInitialized) {
        sonifierState.regionHistoryIndex = 0;
        sonifierState.regionHistory = [region];
        sonifierState.regionHistoryInitialized = true;
      }
      else {
        sonifierState.regionHistory = [...sonifierState.regionHistory.slice(0, sonifierState.regionHistoryIndex + 1), region];
        sonifierState.regionHistoryIndex++;
      }


      return state;
    });

  }

  @Action(UndoRegionSelection)
  @ImmutableContext()
  public undoRegionSelection({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId }: UndoRegionSelection) {
    setState((state: ImageFilesStateModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let sonifierState = state.entities[fileId].sonifier;
      if (!sonifierState.regionHistoryInitialized || sonifierState.regionHistoryIndex == 0) return state;
      sonifierState.regionHistoryIndex--;
      sonifierState.region = sonifierState.regionHistory[sonifierState.regionHistoryIndex];
      return state;
    });

  }

  @Action(RedoRegionSelection)
  @ImmutableContext()
  public redoRegionSelection({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId }: RedoRegionSelection) {
    setState((state: ImageFilesStateModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let sonifierState = state.entities[fileId].sonifier;
      if (!sonifierState.regionHistoryInitialized || sonifierState.regionHistoryIndex == 0) return state;
      sonifierState.regionHistoryIndex++;
      sonifierState.region = sonifierState.regionHistory[sonifierState.regionHistoryIndex];
      return state;
    });

  }

  @Action(ClearRegionHistory)
  @ImmutableContext()
  public clearRegionHistory({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId }: ClearRegionHistory) {
    setState((state: ImageFilesStateModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let sonifierState = state.entities[fileId].sonifier;
      if (!sonifierState.regionHistoryInitialized || sonifierState.regionHistoryIndex == (sonifierState.regionHistory.length - 1)) return state;
      sonifierState.region = null;
      sonifierState.regionHistoryIndex = null
      sonifierState.regionHistory = [];
      sonifierState.regionHistoryInitialized = false;
      return state;
    });

  }

  @Action(UpdateSonificationUri)
  @ImmutableContext()
  public updateSonifierUri({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, uri }: UpdateSonificationUri) {
    setState((state: ImageFilesStateModel) => {
      let sonifierState = state.entities[fileId].sonifier;
      if (sonifierState.region) {
        sonifierState.sonificationUri = this.afterglowDataFileService.getSonificationUri(
          fileId,
          sonifierState.region,
          sonifierState.duration,
          sonifierState.toneCount
        );
        return state;
      }
    })
  }

  @Action(SetProgressLine)
  @ImmutableContext()
  public setProgressLine({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, line }: SetProgressLine) {
    setState((state: ImageFilesStateModel) => {
      let sonifierState = state.entities[fileId].sonifier;
      sonifierState.progressLine = line;
      return state;
    })
  }

  /* Source Extraction */
  @Action(ExtractSources)
  @ImmutableContext()
  public extractSources({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, settings }: ExtractSources) {
    let state = getState();
    let sourceExtractorState = state.entities[fileId].sourceExtractor;
    let dataFiles = this.store.selectSnapshot(DataFilesState.getDataFiles);
    let imageFile = dataFiles[fileId] as ImageFile;
    if (sourceExtractorState.regionOption != SourceExtractorRegionOption.ENTIRE_IMAGE) {
      settings = {
        ...settings,
        x: Math.min(getWidth(imageFile), Math.max(0, sourceExtractorState.region.x + 1)),
        y: Math.min(getHeight(imageFile), Math.max(0, sourceExtractorState.region.y + 1)),
        width: Math.min(getWidth(imageFile), Math.max(0, sourceExtractorState.region.width + 1)),
        height: Math.min(getHeight(imageFile), Math.max(0, sourceExtractorState.region.height + 1))
      }
    }
    let job: SourceExtractionJob = {
      id: null,
      type: JobType.SourceExtraction,
      file_ids: [parseInt(fileId)],
      source_extraction_settings: settings,
      merge_sources: false,
      source_merge_settings: null
    };

    let correlationId = this.correlationIdGenerator.next();
    let createJobAction = new CreateJob(job, 1000, correlationId)
    let { jobCreated$, jobUpdated$, jobCompleted$ } = JobActionHandler.getJobStreams(correlationId, this.actions$);

    return merge(
      dispatch(createJobAction),
      jobCreated$.pipe(
        filter(action => action instanceof CreateJobFail),
        flatMap(action => {
          return dispatch(new ExtractSourcesFail("Failed to create job"))
        })
      ),
      jobCompleted$.pipe(
        flatMap(jobCompleted => {
          let result = jobCompleted.result as SourceExtractionJobResult;
          if (result.errors.length != 0) return dispatch(new ExtractSourcesFail(result.errors.join(',')));
          let sources = result.data.map(d => {
            let posType = PosType.PIXEL;
            let primaryCoord = d.x;
            let secondaryCoord = d.y;

            if (
              "ra_hours" in d &&
              d.ra_hours !== null &&
              "dec_degs" in d &&
              d.dec_degs !== null
            ) {
              posType = PosType.SKY;
              primaryCoord = d.ra_hours;
              secondaryCoord = d.dec_degs;
            }
            return {
              id: d.id,
              label: d.id,
              objectId: null,
              fileId: d.file_id,
              posType: posType,
              primaryCoord: primaryCoord,
              secondaryCoord: secondaryCoord,
              pm: null,
              pmPosAngle: null,
              pmEpoch: d.time ? new Date(d.time) : null
            } as Source;
          });

          return dispatch(new AddSources(sources));
        })
      )
    );
  }

  @Action(UpdateSourceExtractorFileState)
  @ImmutableContext()
  public updateSourceExtractorFileState({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, changes }: UpdateSourceExtractorFileState) {
    setState((state: ImageFilesStateModel) => {
      state.entities[fileId].sourceExtractor = {
        ...state.entities[fileId].sourceExtractor,
        ...changes
      }
      return state;
    });

    return dispatch(new UpdateSourceExtractorRegion(fileId));
  }

  @Action(SetSourceExtractorRegion)
  @ImmutableContext()
  public setSourceExtractorRegion({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, region }: SetSourceExtractorRegion) {
    setState((state: ImageFilesStateModel) => {
      state.entities[fileId].sourceExtractor.region = region;
      return state;
    });

  }

  @Action(UpdateSourceExtractorRegion)
  @ImmutableContext()
  public updateSourceExtractorRegion({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId }: UpdateSourceExtractorRegion) {
    let state = getState();
    let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
    let imageFile = dataFiles[fileId] as ImageFile;
    let sonifierState = state.entities[fileId].sonifier;
    let transformationState = state.entities[fileId].transformation;
    let sourceExtractorState = state.entities[fileId].sourceExtractor;
    let region = null;
    if (
      sourceExtractorState.regionOption ==
      SourceExtractorRegionOption.VIEWPORT
    ) {
      region = getViewportRegion(
        transformationState,
        imageFile
      );
      // region = {
      //   x: imageFileGlobalState.viewport.imageX,
      //   y: imageFileGlobalState.viewport.imageY,
      //   width: imageFileGlobalState.viewport.imageWidth,
      //   height: imageFileGlobalState.viewport.imageHeight
      // }
    } else if (
      sourceExtractorState.regionOption ==
      SourceExtractorRegionOption.SONIFIER_REGION
    ) {
      region = sonifierState.region;
    } else {
      region = {
        x: 0,
        y: 0,
        width: getWidth(imageFile),
        height: getHeight(imageFile)
      };
    }

    return dispatch(new SetSourceExtractorRegion(fileId, region));

  }

  /* Transformation */
  @Action(CenterRegionInViewport)
  @ImmutableContext()
  public centerRegionInViewport({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, region, viewportSize }: CenterRegionInViewport) {
    let state = getState();
    let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
    let imageFile = dataFiles[fileId] as ImageFile;
    let transformationState = state.entities[fileId].transformation;

    if (!viewportSize)
      viewportSize = transformationState.viewportSize;

    let viewportAnchor = new Point(
      viewportSize.width / 2,
      viewportSize.height / 2
    );
    let scale = Math.min(
      (viewportSize.width - 20) / region.width,
      (viewportSize.height - 20) / region.height
    );

    let xShift = viewportAnchor.x - scale * (region.x + region.width / 2);
    let yShift =
      viewportAnchor.y -
      scale * (getHeight(imageFile) - (region.y + region.height / 2));
    let viewportTransform = new Matrix(scale, 0, 0, scale, xShift, yShift);

    return dispatch([
      new ResetImageTransform(fileId),
      new SetViewportTransform(fileId, viewportTransform)
    ])
  }

  @Action(ZoomTo)
  @ImmutableContext()
  public zoomTo({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, scale, anchorPoint }: ZoomTo) {
    let state = getState();
    let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
    let transformationState = state.entities[fileId].transformation;

    let zoomByFactor = scale / getScale(transformationState);

    return dispatch(new ZoomBy(fileId, zoomByFactor, anchorPoint))
  }

  @Action(ZoomBy)
  @ImmutableContext()
  public zoomBy({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, scaleFactor, viewportAnchor }: ZoomBy) {
    setState((state: ImageFilesStateModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let transformation = state.entities[fileId].transformation;

      transformation.viewportTransform = transformation.viewportTransform.clone();

      // max zoom reached when 1 pixel fills viewport
      let viewportULP = transformation.imageToViewportTransform.transform(new Point(0.5, 0.5));
      let viewportLRP = transformation.imageToViewportTransform.transform(new Point(1.5, 1.5));

      let d = viewportULP.getDistance(viewportLRP);
      let reachedMaxZoom = d > transformation.viewportSize.width || d > transformation.viewportSize.height;

      // min zoom reached when image fits in viewer
      viewportLRP = transformation.imageToViewportTransform.transform(new Point(getWidth(imageFile) - 0.5, getHeight(imageFile) - 0.5));
      d = viewportULP.getDistance(viewportLRP);
      let reachedMinZoom = d < transformation.viewportSize.width && d < transformation.viewportSize.height;

      if (scaleFactor === 1 || (scaleFactor > 1 && reachedMaxZoom) || (scaleFactor < 1 && reachedMinZoom)) {
        return state;
      }

      // if image anchor is null, set to center of image viewer
      let anchorPoint = viewportAnchor;
      if (anchorPoint == null) {
        anchorPoint = { x: transformation.viewportSize.width / 2.0, y: transformation.viewportSize.height / 2.0 };
        // let centerViewerPoint = new Point(transformation.viewportSize.width / 2.0, transformation.viewportSize.height / 2.0);
        //let newAnchor = transformation.imageToViewportTransform.inverted().transform(centerViewerPoint);
        //anchorPoint = {x: newAnchor.x+0.5, y: newAnchor.y+0.5};
      }

      anchorPoint = transformation.viewportTransform.inverted().transform(new Point(anchorPoint.x, anchorPoint.y));

      transformation.viewportTransform.scale(scaleFactor, anchorPoint);

      transformation.imageToViewportTransform = transformation.viewportTransform.appended(transformation.imageTransform);

      return state;
    });
  }

  @Action(MoveBy)
  @ImmutableContext()
  public moveBy({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, xShift, yShift }: MoveBy) {
    setState((state: ImageFilesStateModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let transformation = state.entities[fileId].transformation;

      let imageToViewportTransform = transformation.imageToViewportTransform;
      // test if image is almost entirely out of viewer
      let buffer = 50;
      let c1 = imageToViewportTransform.transform(new Point(getWidth(imageFile), getHeight(imageFile)));
      let c2 = imageToViewportTransform.transform(new Point(0, 0));
      let c3 = imageToViewportTransform.transform(new Point(0, getHeight(imageFile)));
      let c4 = imageToViewportTransform.transform(new Point(getWidth(imageFile), 0));
      let maxPoint = new Point(Math.max(c1.x, c2.x, c3.x, c4.x), Math.max(c1.y, c2.y, c3.y, c4.y));
      let minPoint = new Point(Math.min(c1.x, c2.x, c3.x, c4.x), Math.min(c1.y, c2.y, c3.y, c4.y));
      let imageRect = new Rectangle(minPoint.x + buffer + xShift,
        minPoint.y + buffer + yShift,
        maxPoint.x - minPoint.x - (buffer * 2),
        maxPoint.y - minPoint.y - (buffer * 2)
      );


      let viewportRect = new Rectangle(0, 0, transformation.viewportSize.width, transformation.viewportSize.height);
      if (!imageRect.intersects(viewportRect)) {
        return state;
      }

      transformation.viewportTransform = transformation.viewportTransform.clone();
      let xScale = Math.abs(transformation.viewportTransform.a);
      let yScale = Math.abs(transformation.viewportTransform.d);
      transformation.viewportTransform.translate(xShift / xScale, yShift / yScale);
      transformation.imageToViewportTransform = transformation.viewportTransform.appended(transformation.imageTransform);
      return state;
    });
  }

  @Action(SetViewportTransform)
  @ImmutableContext()
  public setViewportTransform({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, transform }: SetViewportTransform) {
    setState((state: ImageFilesStateModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let transformation = state.entities[fileId].transformation;

      transformation.viewportTransform = transform.clone();
      transformation.imageToViewportTransform = transformation.viewportTransform.appended(transformation.imageTransform);
      return state;
    });
  }

  @Action(SetImageTransform)
  @ImmutableContext()
  public setImageTransform({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, transform }: SetImageTransform) {
    setState((state: ImageFilesStateModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let transformation = state.entities[fileId].transformation;

      transformation.imageTransform = transform.clone();
      transformation.imageToViewportTransform = transformation.viewportTransform.appended(transformation.imageTransform);
      return state;
    });
  }

  @Action(ResetImageTransform)
  @ImmutableContext()
  public resetImageTransform({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId }: ResetImageTransform) {
    setState((state: ImageFilesStateModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let transformation = state.entities[fileId].transformation;

      transformation.imageTransform = new Matrix(1, 0, 0, -1, 0, getHeight(imageFile));
      transformation.imageToViewportTransform = transformation.viewportTransform.appended(transformation.imageTransform);
      return state;
    });
  }

  @Action(RotateBy)
  @ImmutableContext()
  public rotateBy({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, rotationAngle }: RotateBy) {
    setState((state: ImageFilesStateModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let transformation = state.entities[fileId].transformation;

      transformation.imageTransform = transformation.imageTransform.clone();
      transformation.imageTransform.rotate(-rotationAngle, getWidth(imageFile) / 2, getHeight(imageFile) / 2);
      transformation.imageToViewportTransform = transformation.viewportTransform.appended(transformation.imageTransform);
      return state;
    });
  }

  @Action(Flip)
  @ImmutableContext()
  public flip({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId }: Flip) {
    setState((state: ImageFilesStateModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let transformation = state.entities[fileId].transformation;

      transformation.imageTransform = transformation.imageTransform.clone();
      transformation.imageTransform.scale(-1, 1, getWidth(imageFile) / 2, getHeight(imageFile) / 2);
      transformation.imageToViewportTransform = transformation.viewportTransform.appended(transformation.imageTransform);
      return state;
    });
  }

  @Action(UpdateCurrentViewportSize)
  @ImmutableContext()
  public updateCurrentViewportSize({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, viewportSize }: UpdateCurrentViewportSize) {
    setState((state: ImageFilesStateModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      if (!state.entities[imageFile.id]) return state;
      let transformation = state.entities[fileId].transformation;

      transformation.viewportSize = viewportSize;
      return state;
    });
  }

  @Action(StartLine)
  @ImmutableContext()
  public startLine({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, point }: StartLine) {
    setState((state: ImageFilesStateModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let plotterState = state.entities[fileId].plotter;

      if (!plotterState.measuring) {
        plotterState.lineMeasureStart = { ...point };
        plotterState.lineMeasureEnd = { ...point };
      }
      else {
        plotterState.lineMeasureEnd = { ...point };
      }
      plotterState.measuring = !plotterState.measuring;

      return state;
    });
  }

  @Action(UpdateLine)
  @ImmutableContext()
  public updateLine({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, point }: UpdateLine) {
    setState((state: ImageFilesStateModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      let plotterState = state.entities[fileId].plotter;

      if (!plotterState.measuring) return state;

      plotterState.lineMeasureEnd = point;

      return state;
    });
  }

  @Action(UpdatePlotterFileState)
  @ImmutableContext()
  public updatePlotterFileState({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, changes }: UpdatePlotterFileState) {
    setState((state: ImageFilesStateModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      state.entities[fileId].plotter = {
        ...state.entities[fileId].plotter,
        ...changes
      }
      return state;
    });
  }

  @Action(UpdateSonifierFileState)
  @ImmutableContext()
  public updateSonifierFileState({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId, changes }: UpdateSonifierFileState) {
    setState((state: ImageFilesStateModel) => {
      let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
      let imageFile = dataFiles[fileId] as ImageFile;
      state.entities[fileId].sonifier = {
        ...state.entities[fileId].sonifier,
        ...changes
      }
      return state;
    });
  }



  @Action([MoveBy, ZoomBy, UpdateCurrentViewportSize, ResetImageTransform, SetViewportTransform, SetImageTransform])
  @ImmutableContext()
  public viewportChanged({ getState, setState, dispatch }: StateContext<ImageFilesStateModel>, { fileId }: MoveBy | ZoomBy | UpdateCurrentViewportSize | ResetImageTransform | SetViewportTransform | SetImageTransform) {
    let imageFileState = getState().entities[fileId];
    let dataFiles = this.store.selectSnapshot(DataFilesState.getEntities);
    let imageFile = dataFiles[fileId] as ImageFile;

    let result = [];
    if (
      imageFile.headerLoaded &&
      imageFileState &&
      imageFileState.transformation.viewportSize
    ) {
      let sonifier = imageFileState.sonifier;
      let sourceExtractor = imageFileState.sourceExtractor;
      if (sonifier.regionMode == SonifierRegionMode.VIEWPORT) {
        result.push(new UpdateSonifierRegion(fileId));
      }

      if (sourceExtractor.regionOption == SourceExtractorRegionOption.VIEWPORT) {
        result.push(new UpdateSourceExtractorRegion(fileId));
      }

    }
    return dispatch(result);
  }
}