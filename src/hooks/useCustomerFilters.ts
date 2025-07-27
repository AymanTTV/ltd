// src/hooks/useCustomerFilters.ts
import { useState, useMemo } from 'react'
import { Customer, Status } from '../types/customer'

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

export function useCustomerFilters(customers: Customer[]) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterExpired, setFilterExpired] = useState(false)
  const [filterSoonExpiring, setFilterSoonExpiring] = useState(false)
  const [ageRange, setAgeRange] = useState<[number, number] | null>(null)
  const [filterLicenseType, setFilterLicenseType] = useState<string>('')
  const [filterOriginalRegion, setFilterOriginalRegion] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<Status | ''>('')

  const filteredCustomers = useMemo(() => {
    const now = new Date()
    const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    return customers.filter(c => {
      // 1) full-text search across name, nickname, phone, email, badge
      if (searchQuery) {
        const q = searchQuery.toLowerCase()

        const fullName   = String(c.fullName).toLowerCase()
        const nickname   = String(c.nickname ?? '').toLowerCase()
        const mobile     = String(c.mobile ?? '').toLowerCase()
        const email      = String(c.email ?? '').toLowerCase()
        const badge      = String(c.badgeNumber ?? '').toLowerCase()

        const match =
          fullName.includes(q) ||
          nickname.includes(q) ||
          mobile.includes(q) ||
          email.includes(q) ||
          badge.includes(q)

        if (!match) return false
      }

      // 2) expired / soon expiring toggles
      if (filterExpired && !(c.billExpiry && c.billExpiry < now)) return false
      if (
        filterSoonExpiring &&
        !(c.billExpiry && c.billExpiry > now && c.billExpiry <= soon)
      ) {
        return false
      }

      // 3) age range filter
      if (ageRange) {
        const age = Math.floor(
          (Date.now() - c.dateOfBirth.getTime()) /
            (1000 * 60 * 60 * 24 * 365)
        )
        if (age < ageRange[0] || age > ageRange[1]) return false
      }

      // 4) license type & original region
      if (filterLicenseType && c.licenseType !== filterLicenseType) return false
      if (filterOriginalRegion && c.originalRegion !== filterOriginalRegion)
        return false

      // 5) status filter
      if (filterStatus && c.status !== filterStatus) return false

      return true
    })
  }, [
    customers,
    searchQuery,
    filterExpired,
    filterSoonExpiring,
    ageRange,
    filterLicenseType,
    filterOriginalRegion,
    filterStatus,
  ])

  return {
    searchQuery,
    setSearchQuery,
    filterExpired,
    setFilterExpired,
    filterSoonExpiring,
    setFilterSoonExpiring,
    ageRange,
    setAgeRange,
    filterLicenseType,
    setFilterLicenseType,
    filterOriginalRegion,
    setFilterOriginalRegion,
    filterStatus,
    setFilterStatus,
    filteredCustomers,
  }
}
