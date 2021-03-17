import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageHduToolbarComponent } from './image-hdu-toolbar.component';

describe('HduToolbarComponent', () => {
  let component: ImageHduToolbarComponent;
  let fixture: ComponentFixture<ImageHduToolbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ImageHduToolbarComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ImageHduToolbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
