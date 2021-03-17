import {
  Component,
  OnInit,
  AfterViewInit,
  Output,
  EventEmitter,
  OnDestroy,
  Optional,
  Inject,
  ViewChild,
  Directive,
  HostListener,
  ContentChildren,
  QueryList,
  ViewChildren,
  ElementRef,
  Attribute,
  Input,
  AfterContentInit,
  forwardRef,
  ContentChild,
  OnChanges,
  HostBinding,
  Renderer2,
} from '@angular/core';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { Location, DOCUMENT } from '@angular/common';
import { MatCheckboxChange, MatCheckbox } from '@angular/material/checkbox';
import { MatSort, Sort, MatSortHeader } from '@angular/material/sort';
import { MatTableDataSource, MatCell, MatRow, MatColumnDef, MatHeaderCell, MatTable } from '@angular/material/table';
import { ENTER, SPACE, UP_ARROW, DOWN_ARROW } from '@angular/cdk/keycodes';
import { SelectionModel } from '@angular/cdk/collections';
import { CollectionViewer, DataSource } from '@angular/cdk/collections';
import { FocusableOption, FocusKeyManager } from '@angular/cdk/a11y';

import { Subscription } from 'rxjs';
import {
  // UP_ARROW,
  // DOWN_ARROW,
  LEFT_ARROW,
  RIGHT_ARROW,
  TAB,
  A,
  Z,
  ZERO,
  NINE,
} from '@angular/cdk/keycodes';
import { CdkColumnDef } from '@angular/cdk/table';

export interface IFocusableCell {
  rowIndex: number;
  columnIndex: number;
  focus();
}

@Directive({
  selector: '[app-cell-focuser]',
  host: {
    '(keydown)': 'onKeydown($event)',
  },
  exportAs: 'cellFocuser',
})
export class CellFocuser {
  activeCell: IFocusableCell = null;
  cells: IFocusableCell[] = [];

  @Output()
  activeCellChange = new EventEmitter<IFocusableCell>();

  /**
   * Register function to be used by the contained IFocusableCells. Adds the IFocusableCell to the
   * collection of IFocusableCells.
   */
  register(cell: IFocusableCell): void {
    this.cells.push(cell);
    if (this.activeCell == null) {
      this.activeCell = cell;
      this.activeCellChange.emit(this.activeCell);
    }
  }

  /**
   * Unregister function to be used by the contained IFocusableCells. Removes the IFocusableCell from the
   * collection of contained IFocusableCells.
   */
  deregister(cell: IFocusableCell): void {
    let index = this.cells.indexOf(cell);
    if (index != -1) this.cells.splice(index, 1);
  }

  setActiveCell(cell: IFocusableCell) {
    if (!cell || this.activeCell == cell) return;
    this.activeCell = cell;
    this.activeCellChange.emit(this.activeCell);
  }

  private setActiveColumnDeltaIndex(delta: number) {
    if (!this.activeCell) return;
    let row = this.cells
      .filter((cell) => cell.rowIndex == this.activeCell.rowIndex)
      .sort((a, b) => a.columnIndex - b.columnIndex);
    if (row.length <= 1) return;
    let i = row.indexOf(this.activeCell);
    i = Math.max(0, Math.min(row.length - 1, i + delta));

    this.setActiveCell(row[i]);
    this.activeCell.focus();
  }

  private setActiveRowDeltaIndex(delta: number) {
    if (!this.activeCell) return;
    let col = this.cells
      .filter((cell) => cell.columnIndex == this.activeCell.columnIndex)
      .sort((a, b) => a.rowIndex - b.rowIndex);
    if (col.length <= 1) return;
    let i = col.indexOf(this.activeCell);
    i = Math.max(0, Math.min(col.length - 1, i + delta));

    this.setActiveCell(col[i]);
    this.activeCell.focus();
  }

  private onKeydown(event: KeyboardEvent): void {
    const keyCode = event.keyCode;
    switch (keyCode) {
      case DOWN_ARROW:
        this.setActiveRowDeltaIndex(1);
        break;

      case UP_ARROW:
        this.setActiveRowDeltaIndex(-1);
        break;

      case RIGHT_ARROW:
        this.setActiveColumnDeltaIndex(1);
        break;

      case LEFT_ARROW:
        this.setActiveColumnDeltaIndex(-1);
        break;

      default:
        // Note that we return here, in order to avoid preventing
        // the default action of non-navigational keys.
        return;
    }
    event.preventDefault();
  }
}

@Directive({
  selector: '[app-focusable-cell]',
  host: {
    '[tabIndex]': 'cellInTabOrder && isActiveCell ? 0 : -1',
    '(focus)': '_handleFocus()',
    '(focusin)': '_handleFocusIn()',
  },
  exportAs: 'cell',
})
export class FocusableCell implements IFocusableCell, OnDestroy, OnInit {
  @Input() rowIndex: number;
  @Input() columnIndex: number;
  @Input() cellInTabOrder: boolean = true;
  hasFocus: boolean = false;
  isActiveCell: boolean = false;
  cellFocuserSub: Subscription;
  sortHeaderButton: HTMLButtonElement;

  constructor(protected elementRef: ElementRef, @Optional() public cellFocuser: CellFocuser) {
    if (!cellFocuser) throw Error('FocusableCell not included in CellFocuser');

    this.cellFocuserSub = this.cellFocuser.activeCellChange.subscribe((activeCell) => {
      this.isActiveCell = this == activeCell;
      if (this.sortHeaderButton) this.sortHeaderButton.tabIndex = this.isActiveCell ? 0 : -1;
    });
  }

  ngOnInit() {
    this.cellFocuser.register(this);
  }

  ngAfterViewInit() {
    let buttons = this.elementRef.nativeElement.querySelectorAll('button.mat-sort-header-button');
    if (buttons.length == 0) return;
    this.sortHeaderButton = buttons[0];
    this.sortHeaderButton.tabIndex = this.cellFocuser.activeCell == this ? 0 : -1;
  }

  ngOnDestroy() {
    this.cellFocuser.deregister(this);
    this.cellFocuserSub.unsubscribe();
  }

  /** Allows for programmatic focusing of the option. */
  focus(): void {
    this.elementRef.nativeElement.focus();
  }

  _handleFocus() {
    if (this.sortHeaderButton) this.sortHeaderButton.focus();
  }

  _handleFocusIn() {
    if (!this.isActiveCell) {
      this.cellFocuser.setActiveCell(this);
    }
  }
}
