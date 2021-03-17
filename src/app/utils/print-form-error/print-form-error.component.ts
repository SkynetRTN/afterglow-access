import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-print-form-error',
  templateUrl: './print-form-error.component.html',
  styleUrls: ['./print-form-error.component.scss'],
})
export class PrintFormErrorComponent implements OnInit {
  @Input('control')
  control: any;

  constructor() {}

  ngOnInit(): void {}
}
