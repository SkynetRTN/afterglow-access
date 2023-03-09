import {
  Component,
  OnInit,
  OnChanges,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { FormBuilder } from '@angular/forms';
import { RectangleMarker } from '../../../models/marker';
import { CustomValidators } from '../../../../utils/custom_form_validator';

import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-rectangle-marker-editor',
  templateUrl: './rectangle-marker-editor.component.html',
  styleUrls: ['./rectangle-marker-editor.component.css'],
})
export class RectangleMarkerEditorComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() marker: RectangleMarker;
  @Output() onChange = new EventEmitter<RectangleMarker>();

  @ViewChild('labelField', { static: true }) labelField: ElementRef;

  form = this.fb.group({
    label: [''],
    width: [null, [Validators.required, CustomValidators.validateNumber, Validators.min(1)]],
    height: [null, [Validators.required, CustomValidators.validateNumber, Validators.min(1)]],
    labelRadius: [null, [Validators.required, CustomValidators.validateNumber]],
    labelTheta: [null, [Validators.required, CustomValidators.validateNumber, Validators.min(0), Validators.max(360)]],
    x: [null, [Validators.required, CustomValidators.validateNumber, Validators.min(0)]],
    y: [null, [Validators.required, CustomValidators.validateNumber, Validators.min(0)]],
  });

  constructor(private fb: FormBuilder) { }

  ngOnInit() {
    this.form.valueChanges.pipe(debounceTime(250)).subscribe((data) => {
      if (this.form.valid) {
        this.onChange.emit({
          id: this.marker.id,
          ...data,
        });
      }
    });
  }

  ngOnChanges() {
    this.form.patchValue(this.marker, { emitEvent: false });
  }

  ngAfterViewInit() { }

  onSubmit() {
    // TODO: Use EventEmitter with form value
    console.warn(this.form.value);
  }
}
