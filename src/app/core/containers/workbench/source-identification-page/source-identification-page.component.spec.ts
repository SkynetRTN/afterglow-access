import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SourceIdentificationPageComponent } from './source-identification-page.component';

describe('SourceExtractorPageComponent', () => {
  let component: SourceIdentificationPageComponent;
  let fixture: ComponentFixture<SourceIdentificationPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SourceIdentificationPageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SourceIdentificationPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
