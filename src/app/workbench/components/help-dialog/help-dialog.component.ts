import { Component, OnInit, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { env } from '../../../../environments/environment';

export interface KeyboardShortcutGroup {
  name: string;
  shortcuts: Array<{ key: string; description: string }>;
}

const KEYBOARD_SHORTCUT_GROUPS: KeyboardShortcutGroup[] = [
  {
    name: 'Workbench Shortcuts',
    shortcuts: [
      { key: 'T', description: 'Open Theme Settings' },
      { key: '?', description: 'Open Help Dialog' },
      { key: 'F', description: 'Open File Manager' },
      { key: 'd', description: 'Display Tool' },
      { key: 'i', description: 'File Info Tool' },
      { key: 'm', description: 'Custom Markers Tool' },
      { key: 'P', description: 'Plotting Tool' },
      { key: 's', description: 'Sonification Tool' },
      // { key: "f", description: "Field Calibration Tool" },
      { key: 'p', description: 'Photometry Tool' },
      { key: '*', description: 'Image Arithmetic Tool' },
      { key: 'w', description: 'WCS Calibration Tool' },
      { key: 'a', description: 'Aligning Tool' },
      { key: 'S', description: 'Stacking Tool' },
      { key: 'esc', description: 'Exit Expanded Panel View' },
      { key: ',', description: 'Expand Workbench File Panel' },
      { key: '.', description: 'Expand Workbench Image Panel' },
      { key: '/', description: 'Expand Workbench Tool Panel' },
    ],
  },
  {
    name: 'Sonification Shortcuts',
    shortcuts: [
      { key: 'space', description: 'Play Sonification' },
      { key: 'ctrl+z', description: 'Undo Region Change' },
      { key: 'ctrl+y', description: 'Redo Region Change' },
      { key: 'left', description: 'Navigation: Low Frequency' },
      { key: 'right', description: 'Navigation: High Frequency' },
      { key: 'left right', description: 'Navigation: Mid Frequency' },
      { key: 'down', description: 'Navigation: Early' },
      { key: 'up', description: 'Navigation: Late' },
      { key: 'down up', description: 'Navigation: Middle' },
      { key: '1', description: 'Navigation: Low Frequency | Beginning' },
      { key: '2', description: 'Navigation: Mid Frequency | Beginning ' },
      { key: '3', description: 'Navigation: High Frequency | Beginning' },
      { key: '4', description: 'Navigation: Low Frequency | Middle' },
      { key: '5', description: 'Navigation: Mid Frequency | Middle' },
      { key: '6', description: 'Navigation: High Frequency | Middle' },
      { key: '7', description: 'Navigation: Low Frequency | End' },
      { key: '8', description: 'Navigation: Mid Frequency | End' },
      { key: '9', description: 'Navigation: High Frequency | End' },
      { key: '0', description: 'Reset Sonification Region' },
    ],
  },
  {
    name: 'Image Viewer Shortcuts',
    shortcuts: [
      { key: '=', description: 'Zoom in' },
      { key: '-', description: 'Zoom out' },
      { key: 'r', description: 'Reset zoom' },
      { key: 'z', description: 'Zoom to fit' },
    ],
  },
];

@Component({
  selector: 'app-help-dialog',
  templateUrl: './help-dialog.component.html',
  styleUrls: ['./help-dialog.component.scss'],
})
export class HelpDialogComponent implements OnInit {
  version = env.version;
  buildDate = env.buildDate;
  displayedColumns: string[] = ['key', 'description'];
  shortcutGroups = KEYBOARD_SHORTCUT_GROUPS;

  shiftModifier(v: string) {
    return v == v.toUpperCase() && v != v.toLowerCase();
  }

  constructor(public dialogRef: MatDialogRef<HelpDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {}

  ngOnInit() {}
}
