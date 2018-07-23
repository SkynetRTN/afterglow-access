import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SourceExtractionSettingsDialogComponent } from './source-extraction-settings-dialog.component';

describe('SourceExtractionSettingsDialogComponent', () => {
  let component: SourceExtractionSettingsDialogComponent;
  let fixture: ComponentFixture<SourceExtractionSettingsDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [SourceExtractionSettingsDialogComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SourceExtractionSettingsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
