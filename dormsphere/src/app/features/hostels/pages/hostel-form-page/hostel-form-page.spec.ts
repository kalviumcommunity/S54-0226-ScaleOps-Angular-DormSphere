import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HostelStoreService } from '../../data/hostel-store.service';

import { HostelFormPage } from './hostel-form-page';

describe('HostelFormPage', () => {
  let component: HostelFormPage;
  let fixture: ComponentFixture<HostelFormPage>;

  const hostelStoreMock: Partial<HostelStoreService> = {
    saving: signal(false),
    errorMessage: signal<string | null>(null),
    getHostelById: () => undefined,
    addHostel: async () => undefined,
    updateHostel: async () => undefined,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostelFormPage],
      providers: [
        provideRouter([]),
        {
          provide: HostelStoreService,
          useValue: hostelStoreMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HostelFormPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
