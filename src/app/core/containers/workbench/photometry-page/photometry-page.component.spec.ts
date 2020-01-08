import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SourceExtractorPageComponent } from './photometry-page.component';

describe('SourceExtractorPageComponent', () => {
  let component: SourceExtractorPageComponent;
  let fixture: ComponentFixture<SourceExtractorPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SourceExtractorPageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SourceExtractorPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
