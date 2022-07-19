import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SourceExtractionRegionDialogComponent } from './source-extraction-dialog.component';

describe('SourceExtractionSettingsDialogComponent', () => {
  let component: SourceExtractionRegionDialogComponent;
  let fixture: ComponentFixture<SourceExtractionRegionDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [SourceExtractionRegionDialogComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SourceExtractionRegionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
