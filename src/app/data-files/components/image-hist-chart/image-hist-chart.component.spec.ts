import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageHistChartComponent } from './image-hist-chart.component';

describe('ImageHistChartComponent', () => {
  let component: ImageHistChartComponent;
  let fixture: ComponentFixture<ImageHistChartComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ImageHistChartComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ImageHistChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
