import { async, ComponentFixture, TestBed } from '@angular/core/testing';


import { DisplayToolComponent } from './display-tool.component';

describe('ViewerPageComponent', () => {
  let component: DisplayToolComponent;
  let fixture: ComponentFixture<DisplayToolComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DisplayToolComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DisplayToolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
