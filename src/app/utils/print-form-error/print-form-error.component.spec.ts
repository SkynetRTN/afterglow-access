import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintFormErrorComponent } from './print-form-error.component';

describe('PrintFormErrorComponent', () => {
  let component: PrintFormErrorComponent;
  let fixture: ComponentFixture<PrintFormErrorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [PrintFormErrorComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintFormErrorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
