import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageOrientationToolbarComponent } from './image-orientation-toolbar.component';

describe('ImageOrientationToolbarComponent', () => {
  let component: ImageOrientationToolbarComponent;
  let fixture: ComponentFixture<ImageOrientationToolbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ImageOrientationToolbarComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ImageOrientationToolbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
