import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageHistogramChartComponent } from './image-histogram-chart.component';

describe('ImageHistChartComponent', () => {
  let component: ImageHistogramChartComponent;
  let fixture: ComponentFixture<ImageHistogramChartComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ImageHistogramChartComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ImageHistogramChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
