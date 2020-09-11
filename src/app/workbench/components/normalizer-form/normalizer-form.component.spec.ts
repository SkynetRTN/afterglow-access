import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NormalizerFormComponent } from './normalizer-form.component';

describe('NormalizerFormComponent', () => {
  let component: NormalizerFormComponent;
  let fixture: ComponentFixture<NormalizerFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NormalizerFormComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NormalizerFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
