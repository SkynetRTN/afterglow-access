import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SourceNeutralizationDialogComponent } from './source-neutralization-dialog.component';

describe('SourceNeutralizationDialogComponent', () => {
  let component: SourceNeutralizationDialogComponent;
  let fixture: ComponentFixture<SourceNeutralizationDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SourceNeutralizationDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SourceNeutralizationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
