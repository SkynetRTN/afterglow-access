import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { InfoToolComponent } from './info-tool.component';

describe('InfoToolComponent', () => {
  let component: InfoToolComponent;
  let fixture: ComponentFixture<InfoToolComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ InfoToolComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InfoToolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
