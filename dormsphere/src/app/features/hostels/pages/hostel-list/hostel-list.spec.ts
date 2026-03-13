import { ComponentFixture, TestBed } from '@angular/core/testing';
import { computed, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HostelStoreService } from '../../data/hostel-store.service';
import { Hostel } from '../../data/hostel.model';

import { HostelList } from './hostel-list';

describe('HostelList', () => {
  let component: HostelList;
  let fixture: ComponentFixture<HostelList>;

  const hostelFixtures: Hostel[] = [
    {
      id: '1',
      name: 'Oak Residency',
      location: 'North Campus',
      type: 'BOYS',
      wardenName: 'Ava Green',
      wardenExtension: '4101',
      capacity: 100,
      occupiedBeds: 75,
      status: 'AVAILABLE',
    },
    {
      id: '2',
      name: 'Maple House',
      location: 'West Wing',
      type: 'GIRLS',
      wardenName: 'Mia Stone',
      wardenExtension: '4102',
      capacity: 80,
      occupiedBeds: 78,
      status: 'ALMOST FULL',
    },
    {
      id: '3',
      name: 'Cedar Commons',
      location: 'East Annex',
      type: 'CO-ED',
      wardenName: 'Noah Clarke',
      wardenExtension: '4103',
      capacity: 60,
      occupiedBeds: 60,
      status: 'FULLY OCCUPIED',
    },
  ];

  const hostelsSignal = signal<Hostel[]>(hostelFixtures);
  const loadingSignal = signal(false);
  const errorSignal = signal<string | null>(null);

  const hostelStoreMock: Partial<HostelStoreService> = {
    hostels: hostelsSignal,
    loading: loadingSignal,
    errorMessage: errorSignal,
    totals: computed(() => {
      const items = hostelsSignal();
      const totalCapacity = items.reduce((sum, hostel) => sum + hostel.capacity, 0);
      const occupiedBeds = items.reduce((sum, hostel) => sum + hostel.occupiedBeds, 0);
      const availableBeds = Math.max(totalCapacity - occupiedBeds, 0);

      return {
        totalCapacity,
        occupiedBeds,
        availableBeds,
        occupancyRate: totalCapacity === 0 ? 0 : (occupiedBeds / totalCapacity) * 100,
      };
    }),
    deleteHostel: async () => true,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostelList],
      providers: [
        provideRouter([]),
        {
          provide: HostelStoreService,
          useValue: hostelStoreMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HostelList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('filters hostels by search term', () => {
    component.setSearchTerm('west');

    expect(component.filteredHostels().map((hostel) => hostel.id)).toEqual(['2']);
  });

  it('filters hostels by type and status', () => {
    component.setTypeFilter('GIRLS');
    component.setStatusFilter('ALMOST FULL');

    expect(component.filteredHostels().map((hostel) => hostel.id)).toEqual(['2']);
  });

  it('ignores invalid type/status filter values', () => {
    component.setTypeFilter('BOYS');
    component.setStatusFilter('AVAILABLE');

    component.setTypeFilter('INVALID');
    component.setStatusFilter('BAD_STATUS');

    expect(component.selectedType()).toBe('BOYS');
    expect(component.selectedStatus()).toBe('AVAILABLE');
  });

  it('resets search and filters', () => {
    component.setSearchTerm('oak');
    component.setTypeFilter('BOYS');
    component.setStatusFilter('AVAILABLE');

    component.resetFilters();

    expect(component.searchTerm()).toBe('');
    expect(component.selectedType()).toBe('ALL');
    expect(component.selectedStatus()).toBe('ANY');
    expect(component.filteredHostels().length).toBe(hostelFixtures.length);
  });
});
