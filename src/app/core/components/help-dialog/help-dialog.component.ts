import { Component, OnInit, Inject } from "@angular/core";
import {
  MatDialog,
  MatDialogRef,
  MAT_DIALOG_DATA
} from "@angular/material/dialog";

export interface KeyboardShortcutGroup {
  name: string;
  shortcuts: Array<{ key: string; description: string }>;
}

const KEYBOARD_SHORTCUT_GROUPS: KeyboardShortcutGroup[] = [
  {
    name: "Global Shortcuts",
    shortcuts: [
      { key: "W", description: "Workbench Page" },
      { key: "D", description: "Data Provider Page" },
      { key: "T", description: "Open Theme Settings" },
      { key: "?", description: "Open Quick Start Guide" },
    ]
  },
  {
    name: "Workbench Shortcuts",
    shortcuts: [
      { key: "d", description: "Display Settings" },
      { key: "i", description: "File Info Tool" },
      { key: "m", description: "Custom Markers Tool" },
      { key: "c", description: "Plotting Tool" },
      { key: "s", description: "Sonification Tool" },
      { key: "f", description: "Field Calibration Tool" },
      { key: "p", description: "Photometry Tool" },
      { key: "o", description: "Image Arithmetic Tool" },
      { key: "a", description: "Aligning Tool" },
      { key: "z", description: "Stacking Tool" },
      { key: "W", description: "Reset Workbench View" },
      { key: "1", description: "Show Only Workbench File Panel" },
      { key: "2", description: "Only Workbench Image Panel" },
      { key: "3", description: "Only Workbench Tool Panel" }
    ]
  },
  {
    name: "Sonification Shortcuts",
    shortcuts: [
      { key: "enter", description: "Play Sonification" },
      { key: "t 1", description: "Time Navigation: Early" },
      { key: "t 2", description: "Time Navigation: Mid" },
      { key: "t 3", description: "Time Navigation: Late" },
      { key: "f 1", description: "Frequency Navigation: Low" },
      { key: "f 2", description: "Frequency Navigation: Mid" },
      { key: "f 3", description: "Frequency Navigation: High" },
      { key: "esc", description: "Reset Sonification Region" },
    ]
  },
  {
    name: "Image Viewer Shortcuts",
    shortcuts: [
      { key: "+", description: "Zoom in" },
      { key: "-", description: "Zoom out" },
      { key: "0", description: "Reset zoom" },
      { key: "z", description: "Zoom to fit" },
    ]
  }
];

@Component({
  selector: "app-help-dialog",
  templateUrl: "./help-dialog.component.html",
  styleUrls: ["./help-dialog.component.scss"]
})
export class HelpDialogComponent implements OnInit {
  displayedColumns: string[] = ["key", "description"];
  shortcutGroups = KEYBOARD_SHORTCUT_GROUPS;

  shiftModifier(v: string) {
    return v == v.toUpperCase() && v != v.toLowerCase();
  }

  constructor(
    public dialogRef: MatDialogRef<HelpDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit() {}
}
