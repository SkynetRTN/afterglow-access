import { async, ComponentFixture, TestBed } from '@angular/core/testing';


import { FieldCalPageComponent } from './field-cal-page.component';

describe('FieldCalPageComponent', () => {
  let component: FieldCalPageComponent;
  let fixture: ComponentFixture<FieldCalPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FieldCalPageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FieldCalPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
