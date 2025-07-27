// src/components/customers/CustomerFilters.tsx
import React from 'react'
import { Status, Customer } from '../../types/customer'

export const STATUSES: Status[] = [
  'ACTIVE',
  'SUSPENDED',
  'INEED',
  'DICEASED',
  'COMMITTEE',
  'UNDER REVIEW',
  'AWAY',
  'KOL',
]

// must match Customer.originalRegion
const REGIONS: Customer['originalRegion'][] = [
  'NORTH LONDON',
  'NORTH WEST',
  'EAST LONDON',
  'SOUTH EAST',
  'SOUTH WEST',
  'WEST LONDON',
  'CENTRAL',
  'UNKNOWN',
]

interface Props {
  searchQuery: string
  onSearchChange: (q: string) => void

  statusFilter: Status | ''
  onStatusChange: (s: Status | '') => void

  filterLicenseType: string
  onLicenseTypeChange: (t: string) => void

  filterOriginalRegion: Customer['originalRegion'] | ''
  onRegionChange: (r: Customer['originalRegion'] | '') => void

  ageRange: [number, number] | null
  onAgeRangeFilter: (r: [number, number]) => void

  filterExpired: boolean
  onFilterExpired: (b: boolean) => void

  filterSoonExpiring: boolean
  onFilterSoonExpiring: (b: boolean) => void
}

export default function CustomerFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  filterLicenseType,
  onLicenseTypeChange,
  filterOriginalRegion,
  onRegionChange,
  ageRange,
  onAgeRangeFilter,
  filterExpired,
  onFilterExpired,
  filterSoonExpiring,
  onFilterSoonExpiring,
}: Props) {
  const minAge = ageRange?.[0] ?? ''
  const maxAge = ageRange?.[1] ?? ''

  return (
    <div className="space-y-4">
      {/* first row: Search / Status / License Type */}
      <div className="grid grid-cols-3 gap-4">
        {/* Search */}
        <div>
          <label className="form-label">Search</label>
          <input
            type="text"
            className="form-input"
            placeholder="Name, email, phone, badge…"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>

        {/* Status */}
        <div>
          <label className="form-label">Status</label>
          <select
            className="form-select"
            value={statusFilter}
            onChange={e => onStatusChange(e.target.value as Status | '')}
          >
            <option value="">All</option>
            {STATUSES.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* License Type */}
        <div>
          <label className="form-label">License Type</label>
          <select
            className="form-select"
            value={filterLicenseType}
            onChange={e => onLicenseTypeChange(e.target.value)}
          >
            <option value="">All</option>
            <option value="Green">Green</option>
            <option value="Yellow">Yellow</option>
          </select>
        </div>
      </div>

      {/* second row: Region / Age Range / Expiration Toggles */}
      <div className="grid grid-cols-3 gap-4">
        {/* Region */}
        <div>
          <label className="form-label">Region</label>
          <select
            className="form-select"
            value={filterOriginalRegion}
            onChange={e => onRegionChange(e.target.value as Customer['originalRegion'] | '')}
          >
            <option value="">All</option>
            {REGIONS.map(region => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>

        {/* Age Range */}
        <div>
          <label className="form-label">Age Range</label>
          <div className="flex space-x-2">
            <input
              type="number"
              className="form-input"
              placeholder="Min"
              value={minAge}
              onChange={e => {
                const newMin = e.target.value === '' ? 0 : Number(e.target.value)
                const existingMax = ageRange?.[1] ?? 0
                onAgeRangeFilter([newMin, existingMax])
              }}
            />
            <input
              type="number"
              className="form-input"
              placeholder="Max"
              value={maxAge}
              onChange={e => {
                const newMax = e.target.value === '' ? 0 : Number(e.target.value)
                const existingMin = ageRange?.[0] ?? 0
                onAgeRangeFilter([existingMin, newMax])
              }}
            />
          </div>
        </div>

        {/* Expiration */}
        <div className="space-y-2">
          <label className="form-label">Expiration</label>
          <div className="flex items-center space-x-4">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                className="form-checkbox"
                checked={filterExpired}
                onChange={e => onFilterExpired(e.target.checked)}
              />
              <span className="ml-2">Expired</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                className="form-checkbox"
                checked={filterSoonExpiring}
                onChange={e => onFilterSoonExpiring(e.target.checked)}
              />
              <span className="ml-2">Soon</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
