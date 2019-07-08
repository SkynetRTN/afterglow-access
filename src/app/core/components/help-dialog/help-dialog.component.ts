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
    name: "Workbench Shortcuts",
    shortcuts: [
      { key: "d", description: "Show Display Settings" },
      { key: "i", description: "Show File Info Tool" },
      { key: "m", description: "Show Custom Markers Tool" },
      { key: "c", description: "Show Plotting Tool" },
      { key: "s", description: "Show Sonification Tool" },
      { key: "f", description: "Show Field Calibration Tool" },
      { key: "p", description: "Show Photometry Tool" },
      { key: "o", description: "Show Image Arithmetic Tool" },
      { key: "a", description: "Show Aligning Tool" },
      { key: "z", description: "Show Stacking Tool" },
      { key: "w 0", description: "Show All Workbench Panels" },
      { key: "w 1", description: "Show Only Workbench File Panel" },
      { key: "w 2", description: "Show Only Workbench Image Panel" },
      { key: "w 3", description: "Show Only Workbench Tool Panel" }
    ]
  },
  {
    name: "Sonification Shortcuts",
    shortcuts: [
      { key: "enter", description: "play Sonification" },
      { key: "t 1", description: "Time Navigation: Early" },
      { key: "t 2", description: "Time Navigation: Mid" },
      { key: "t 3", description: "Time Navigation: Late" },
      { key: "f 1", description: "Frequency Navigation: Low" },
      { key: "f 2", description: "Frequency Navigation: Mid" },
      { key: "f 3", description: "Frequency Navigation: High" },
      { key: "esc", description: "Reset Sonification Region" },
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

  constructor(
    public dialogRef: MatDialogRef<HelpDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit() {}
}
