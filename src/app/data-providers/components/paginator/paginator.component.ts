import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Inject,
  Input,
  OnInit,
  Optional,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import { MatFormFieldAppearance } from '@angular/material/form-field';
import {
  MatPaginatorDefaultOptions,
  MatPaginatorIntl,
  MAT_PAGINATOR_DEFAULT_OPTIONS,
  _MatPaginatorBase,
} from '@angular/material/paginator';

/**
 * Component to provide navigation between paged information. Displays the size of the current
 * page, user-selectable options to change that size, what items are being shown, and
 * navigational button to go to the previous or next page.
 */
@Component({
  selector: 'app-paginator',
  exportAs: 'appPaginator',
  templateUrl: 'paginator.component.html',
  styleUrls: ['paginator.component.scss'],
  inputs: ['disabled'],
  host: {
    class: 'mat-paginator',
    role: 'group',
  },
  encapsulation: ViewEncapsulation.None,
})
export class PaginatorComponent extends _MatPaginatorBase<MatPaginatorDefaultOptions> {
  /** If set, styles the "page size" form field with the designated style. */
  _formFieldAppearance?: MatFormFieldAppearance;

  @Input() first: string;
  @Input() last: string;
  @Input() next: string;
  @Input() previous: string;

  @Output() keyChange = new EventEmitter<string>();
  @Output() pageSizeChange = new EventEmitter<number>();

  constructor(
    intl: MatPaginatorIntl,
    changeDetectorRef: ChangeDetectorRef,
    @Optional() @Inject(MAT_PAGINATOR_DEFAULT_OPTIONS) defaults?: MatPaginatorDefaultOptions
  ) {
    super(intl, changeDetectorRef, defaults);

    if (defaults && defaults.formFieldAppearance != null) {
      this._formFieldAppearance = defaults.formFieldAppearance;
    }
  }

  _previousButtonsDisabled() {
    return this.previous === undefined;
  }

  firstPage() {
    this.keyChange.emit(this.first);
  }

  previousPage() {
    this.keyChange.emit(this.previous);
  }

  _nextButtonsDisabled() {
    return this.next === undefined;
  }

  nextPage() {
    this.keyChange.emit(this.next);
  }

  lastPage() {
    this.keyChange.emit(this.last);
  }

  _changePageSize(pageSize: number) {
    // Current page needs to be updated to reflect the new page size. Navigate to the page
    this.pageSize = pageSize;
    this.pageSizeChange.emit(this.pageSize);
  }
}
