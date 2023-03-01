export interface SourcePanelConfig {
    centroidClicks: boolean;
    planetCentroiding: boolean;
    showSourceLabels: boolean;
    showSourceMarkers: boolean;
    showSourcesFromAllFiles: boolean;
    selectedSourceIds: string[];
    coordMode: 'pixel' | 'sky';
}