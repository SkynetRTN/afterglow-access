import { Component, OnInit, Inject } from "@angular/core";
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";

export interface KeyboardShortcutGroup {
  name: string;
  shortcuts: Array<{ key: string; description: string }>;
}

const KEYBOARD_SHORTCUT_GROUPS: KeyboardShortcutGroup[] = [
  {
    name: "Global Shortcuts",
    shortcuts: [
      { key: "W", description: "Workbench Page" },
      { key: "T", description: "Open Theme Settings" },
      { key: "F", description: "Open File Manager" },
      { key: "?", description: "Open Quick Start Guide" },
    ],
  },
  {
    name: "Workbench Shortcuts",
    shortcuts: [
      { key: "d", description: "Display Settings" },
      { key: "i", description: "File Info Tool" },
      { key: "m", description: "Custom Markers Tool" },
      { key: "P", description: "Plotting Tool" },
      { key: "s", description: "Sonification Tool" },
      // { key: "f", description: "Field Calibration Tool" },
      { key: "p", description: "Photometry Tool" },
      { key: "*", description: "Image Arithmetic Tool" },
      { key: "a", description: "Aligning Tool" },
      { key: "S", description: "Stacking Tool" },
      { key: "esc", description: "Reset Workbench View" },
      { key: "7", description: "Show Only Workbench File Panel" },
      { key: "8", description: "Only Workbench Image Panel" },
      { key: "9", description: "Only Workbench Tool Panel" },
    ],
  },
  {
    name: "Sonification Shortcuts",
    shortcuts: [
      { key: ".", description: "Play Sonification" },
      { key: "ctrl+z", description: "Undo Region Change" },
      { key: "ctrl+y", description: "Redo Region Change" },
      { key: "1", description: "Time Navigation: Early" },
      { key: "2", description: "Time Navigation: Mid" },
      { key: "3", description: "Time Navigation: Late" },
      { key: "4", description: "Frequency Navigation: Low" },
      { key: "5", description: "Frequency Navigation: Mid" },
      { key: "6", description: "Frequency Navigation: High" },
      { key: "0", description: "Reset Sonification Region" },
    ],
  },
  {
    name: "Image Viewer Shortcuts",
    shortcuts: [
      { key: "+", description: "Zoom in" },
      { key: "-", description: "Zoom out" },
      { key: "r", description: "Reset zoom" },
      { key: "z", description: "Zoom to fit" },
    ],
  },
];

@Component({
  selector: "app-help-dialog",
  templateUrl: "./help-dialog.component.html",
  styleUrls: ["./help-dialog.component.scss"],
})
export class HelpDialogComponent implements OnInit {
  displayedColumns: string[] = ["key", "description"];
  shortcutGroups = KEYBOARD_SHORTCUT_GROUPS;

  shiftModifier(v: string) {
    return v == v.toUpperCase() && v != v.toLowerCase();
  }

  constructor(public dialogRef: MatDialogRef<HelpDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {}

  ngOnInit() {}
}
