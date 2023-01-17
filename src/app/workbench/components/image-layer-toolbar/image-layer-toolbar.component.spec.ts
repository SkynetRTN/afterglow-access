import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageLayerToolbarComponent } from './image-layer-toolbar.component';

describe('LayerToolbarComponent', () => {
  let component: ImageLayerToolbarComponent;
  let fixture: ComponentFixture<ImageLayerToolbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ImageLayerToolbarComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ImageLayerToolbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
