import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RectangleMarkerEditorComponent } from './rectangle-marker-editor.component';

describe('RectangleMarkerEditorComponent', () => {
  let component: RectangleMarkerEditorComponent;
  let fixture: ComponentFixture<RectangleMarkerEditorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [RectangleMarkerEditorComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RectangleMarkerEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
