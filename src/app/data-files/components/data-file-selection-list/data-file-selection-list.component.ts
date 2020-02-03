import {
  Component, OnInit, Attribute, forwardRef,
  Inject, Optional, Input, QueryList, ElementRef,
  ContentChildren, Output, EventEmitter, AfterContentInit, ViewEncapsulation, ChangeDetectorRef, ChangeDetectionStrategy,
  OnDestroy
} from '@angular/core';
import {
  CanDisable,
  CanDisableRipple,
  HasTabIndex,
  mixinDisabled,
  mixinDisableRipple,
  mixinTabIndex,
} from '@angular/material/core';

import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { SPACE, ENTER, HOME, END } from '@angular/cdk/keycodes';
import { FocusableOption, FocusKeyManager } from '@angular/cdk/a11y'
import { SelectionModel } from '@angular/cdk/collections';
import { DataFile } from '../../models/data-file';


export class DataFileSelectionListBase { }
export const _DataFileSelectionListBaseMixinBase =
  mixinTabIndex(mixinDisableRipple(mixinDisabled(DataFileSelectionListBase)));

/** Change event that is being fired whenever the selected state of an option changes. */
export class DataFileSelectionListChange {
  constructor(
    /** Reference to the selection list that emitted the event. */
    public source: DataFileSelectionListComponent,
    /** Reference to the option that has been changed. */
    public option: DataFileListItemComponent) { }
}


@Component({
  selector: 'app-data-file-list-item',
  templateUrl: './data-file-list-item.component.html',
  styleUrls: ['./data-file-list-item.component.css'],
  host: {
    'role': 'option',
    'class': 'data-file-list-item',
    '(focus)': '_handleFocus()',
    '(blur)': '_handleBlur()',
    '(click)': '_handleClick()',
    'tabindex': '-1',
    '[class.disabled]': 'disabled',
    '[class.focused]': '_hasFocus',
    '[class.selected]': '_selected',
    '[attr.aria-selected]': 'selected.toString()',
    '[attr.aria-disabled]': 'disabled.toString()',
  },
  encapsulation: ViewEncapsulation.None,
  preserveWhitespaces: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataFileListItemComponent
  implements AfterContentInit, OnDestroy, OnInit, FocusableOption {

  private _selected: boolean = false;
  private _disabled: boolean = false;

  /** Whether the option has focus. */
  _hasFocus: boolean = false;

  /** Value of the option */
  @Input() file: DataFile;

  /** Whether the option is disabled. */
  @Input()
  get disabled() { return this._disabled || (this.selectionList && this.selectionList.disabled); }
  set disabled(value: any) {
    const newValue = coerceBooleanProperty(value);

    if (newValue !== this._disabled) {
      this._disabled = newValue;
      this._changeDetector.markForCheck();
    }
  }

  /** Whether the option is selected. */
  @Input()
  get selected(): boolean { return this.selectionList.selectedOptions.isSelected(this); }
  set selected(value: boolean) {
    const isSelected = coerceBooleanProperty(value);

    if (isSelected !== this._selected) {
      this._setSelected(isSelected);
      this.selectionList._reportValueChange();
    }
  }

  public selectionList: DataFileSelectionListComponent;

  constructor(private _element: ElementRef,
    private _changeDetector: ChangeDetectorRef,
    /** @docs-private */ @Optional() @Inject(forwardRef(() => DataFileSelectionListComponent))
    selectionList) {
      this.selectionList = selectionList as DataFileSelectionListComponent;
  }

  getLabel() {
    return this.file ? this.file.name : '';
  }

  ngOnInit() {
    if (this._selected) {
      // List options that are selected at initialization can't be reported properly to the form
      // control. This is because it takes some time until the selection-list knows about all
      // available options. Also it can happen that the ControlValueAccessor has an initial value
      // that should be used instead. Deferring the value change report to the next tick ensures
      // that the form control value is not being overwritten.
      Promise.resolve().then(() => this.selected = true);
    }
  }

  ngAfterContentInit() {
  }

  ngOnDestroy(): void {
    if (this.selected) {
      // We have to delay this until the next tick in order
      // to avoid changed after checked errors.
      Promise.resolve().then(() => this.selected = false);
    }

    this.selectionList._removeOptionFromList(this);
  }

  /** Allows for programmatic focusing of the option. */
  focus(): void {
    this._element.nativeElement.focus();
  }

  _handleClick() {
    if (!this.disabled && !this.selected) {
      this.selected = true;
      // Emit a change event if the selected state of the option changed through user interaction.
      this.selectionList._emitChangeEvent(this);
    }
  }

  _handleFocus() {
    this._hasFocus = true;
    this.selectionList._setFocusedOption(this);
  }

  _handleBlur() {
    this._hasFocus = false;
    this.selectionList._onTouched();
  }

  /** Retrieves the DOM element of the component host. */
  _getHostElement(): HTMLElement {
    return this._element.nativeElement;
  }

  /** Sets the selected state of the option. */
  _setSelected(selected: boolean) {
    if (selected === this._selected) {
      return;
    }

    this._selected = selected;

    if (selected) {
      this.selectionList.selectedOptions.select(this);
    } else {
      this.selectionList.selectedOptions.deselect(this);
    }

    this._changeDetector.markForCheck();
  }

}


@Component({
  selector: 'app-data-file-selection-list',
  styleUrls: ['./data-file-selection-list.component.scss'],
  inputs: ['disabled', 'disableRipple', 'tabIndex'],
  host: {
    'role': 'listbox',
    '[tabIndex]': 'tabIndex',
    'class': 'data-file-select-list',
    '(focus)': 'focus()',
    '(blur)': '_onTouched()',
    '(keydown)': '_keydown($event)',
    '[attr.aria-disabled]': 'disabled.toString()'
  },
  template: '<ng-content></ng-content>',
})
export class DataFileSelectionListComponent extends _DataFileSelectionListBaseMixinBase implements FocusableOption,
  CanDisable, CanDisableRipple, HasTabIndex, AfterContentInit, ControlValueAccessor {

  /** The FocusKeyManager which handles focus. */
  _keyManager: FocusKeyManager<DataFileListItemComponent>;

  /** The option components contained within this selection-list. */
  @ContentChildren(DataFileListItemComponent) options: QueryList<DataFileListItemComponent>;

  /** Emits a change event whenever the selected state of an option changes. */
  @Output() readonly selectionChange: EventEmitter<DataFileSelectionListChange> =
    new EventEmitter<DataFileSelectionListChange>();

  /** The currently selected options. */
  selectedOptions: SelectionModel<DataFileListItemComponent> = new SelectionModel<DataFileListItemComponent>(false);

  /** View to model callback that should be called whenever the selected options change. */
  private _onChange: (value: any) => void = (_: any) => { };

  /** Used for storing the values that were assigned before the options were initialized. */
  private _tempValues: string[] | null;

  /** View to model callback that should be called if the list or its options lost focus. */
  _onTouched: () => void = () => { };

  constructor(private _element: ElementRef, @Attribute('tabindex') tabIndex: string) {
    super();

    this.tabIndex = parseInt(tabIndex) || 0;
  }

  ngAfterContentInit(): void {
    this._keyManager = new FocusKeyManager<DataFileListItemComponent>(this.options).withWrap().withTypeAhead();

    if (this._tempValues) {
      this._setOptionsFromValues(this._tempValues);
      this._tempValues = null;
    }
  }

  /** Focus the selection-list. */
  focus() {
    this._element.nativeElement.focus();
  }

  /** Selects all of the options. */
  selectAll() {
    this.options.forEach(option => option._setSelected(true));
    this._reportValueChange();
  }

  /** Deselects all of the options. */
  deselectAll() {
    this.options.forEach(option => option._setSelected(false));
    this._reportValueChange();
  }

  /** Sets the focused option of the selection-list. */
  _setFocusedOption(option: DataFileListItemComponent) {
    this._keyManager.updateActiveItemIndex(this._getOptionIndex(option));
  }

  /** Removes an option from the selection list and updates the active item. */
  _removeOptionFromList(option: DataFileListItemComponent) {
    if (option._hasFocus) {
      const optionIndex = this._getOptionIndex(option);

      // Check whether the option is the last item
      if (optionIndex > 0) {
        this._keyManager.setPreviousItemActive();
      } else if (optionIndex === 0 && this.options.length > 1) {
        this._keyManager.setNextItemActive();
      }
    }
  }

  /** Passes relevant key presses to our key manager. */
  _keydown(event: KeyboardEvent) {
    switch (event.keyCode) {
      case SPACE:
      case ENTER:
        this._selectFocusedOption();
        // Always prevent space from scrolling the page since the list has focus
        event.preventDefault();
        break;
      case HOME:
      case END:
        event.keyCode === HOME ? this._keyManager.setFirstItemActive() :
          this._keyManager.setLastItemActive();
        event.preventDefault();
        break;
      default:
        this._keyManager.onKeydown(event);
    }
  }

  /** Reports a value change to the ControlValueAccessor */
  _reportValueChange() {
    if (this.options) {
      this._onChange(this._getSelectedOptionValues());
    }
  }

  /** Emits a change event if the selected state of an option changed. */
  _emitChangeEvent(option: DataFileListItemComponent) {
    this.selectionChange.emit(new DataFileSelectionListChange(this, option));
  }

  /** Implemented as part of ControlValueAccessor. */
  writeValue(values: string[]): void {
    if (this.options) {
      this._setOptionsFromValues(values || []);
    } else {
      this._tempValues = values;
    }
  }

  /** Implemented as a part of ControlValueAccessor. */
  setDisabledState(isDisabled: boolean): void {
    if (this.options) {
      this.options.forEach(option => option.disabled = isDisabled);
    }
  }

  /** Implemented as part of ControlValueAccessor. */
  registerOnChange(fn: (value: any) => void): void {
    this._onChange = fn;
  }

  /** Implemented as part of ControlValueAccessor. */
  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  /** Returns the option with the specified value. */
  private _getOptionByValue(value: string): DataFileListItemComponent | undefined {
    return this.options.find(option => option.file.id === value);
  }

  /** Sets the selected options based on the specified values. */
  private _setOptionsFromValues(values: string[]) {
    this.options.forEach(option => option._setSelected(false));

    values
      .map(value => this._getOptionByValue(value))
      .filter(Boolean)
      .forEach(option => option!._setSelected(true));
  }

  /** Returns the values of the selected options. */
  private _getSelectedOptionValues(): DataFile[] {
    return this.options.filter(option => option.selected).map(option => option.file);
  }

  /** Toggles the selected state of the currently focused option. */
  private _selectFocusedOption(): void {
    let focusedIndex = this._keyManager.activeItemIndex;


    if (focusedIndex != null && this._isValidIndex(focusedIndex)) {
      this.options.forEach((option, index) => {
        if (index == focusedIndex) {
          if (!option.selected) {
            option.selected = true;
            this._emitChangeEvent(option)
          }
        }
        else {
          option.selected = false;
        }
      })
    }
  }

  /**
   * Utility to ensure all indexes are valid.
   * @param index The index to be checked.
   * @returns True if the index is valid for our list of options.
   */
  private _isValidIndex(index: number): boolean {
    return index >= 0 && index < this.options.length;
  }

  /** Returns the index of the specified list option. */
  private _getOptionIndex(option: DataFileListItemComponent): number {
    return this.options.toArray().indexOf(option);
  }

}
