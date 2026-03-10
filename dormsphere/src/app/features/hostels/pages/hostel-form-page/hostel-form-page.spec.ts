import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HostelFormPage } from './hostel-form-page';

describe('HostelFormPage', () => {
  let component: HostelFormPage;
  let fixture: ComponentFixture<HostelFormPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostelFormPage],
    }).compileComponents();

    fixture = TestBed.createComponent(HostelFormPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
