import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SourceExtractionDialogComponent } from './source-extraction-dialog.component';

describe('SourceExtractionSettingsDialogComponent', () => {
  let component: SourceExtractionDialogComponent;
  let fixture: ComponentFixture<SourceExtractionDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [SourceExtractionDialogComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SourceExtractionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
