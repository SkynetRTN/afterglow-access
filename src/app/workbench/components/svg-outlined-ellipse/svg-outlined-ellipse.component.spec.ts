import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SvgOutlinedEllipseComponent } from './svg-outlined-ellipse.component';

describe('SvgOutlinedEllipseComponent', () => {
  let component: SvgOutlinedEllipseComponent;
  let fixture: ComponentFixture<SvgOutlinedEllipseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SvgOutlinedEllipseComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SvgOutlinedEllipseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
