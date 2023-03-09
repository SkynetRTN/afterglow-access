import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MergeSourcesDialogComponent } from './merge-sources-dialog.component';

describe('MergeSourcesDialogComponent', () => {
  let component: MergeSourcesDialogComponent;
  let fixture: ComponentFixture<MergeSourcesDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MergeSourcesDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MergeSourcesDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
