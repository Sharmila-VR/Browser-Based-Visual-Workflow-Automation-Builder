import { describe, it, expect } from 'vitest'
import { parseCron, isValidCron, getNextCronDate } from '../src/core/execution/cron.js'

describe('Custom Cron Parser & Scheduling Engine', () => {
  it('parses standard 5-field cron expressions', () => {
    const parsed = parseCron('*/15 9-17 * * 1-5')
    expect(parsed.minutes).toEqual([0, 15, 30, 45])
    expect(parsed.hours).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17])
    expect(parsed.daysOfWeek).toEqual([1, 2, 3, 4, 5])
    expect(parsed.months.length).toBe(12)
  })

  it('parses shortcuts like @hourly, @daily, @weekly, @monthly, @midnight, @annually', () => {
    expect(parseCron('@hourly').minutes).toEqual([0])
    expect(parseCron('@daily').hours).toEqual([0])
    expect(parseCron('@midnight').hours).toEqual([0])
    expect(parseCron('@weekly').daysOfWeek).toEqual([0])
    expect(parseCron('@monthly').daysOfMonth).toEqual([1])
    expect(parseCron('@yearly').months).toEqual([1])
    expect(parseCron('@annually').months).toEqual([1])
  })

  it('validates invalid expressions and throws appropriate errors', () => {
    expect(isValidCron('* * * * *')).toBe(true)
    expect(isValidCron('*/5 * * * *')).toBe(true)
    expect(isValidCron('@hourly')).toBe(true)
    expect(isValidCron('invalid string')).toBe(false)
    expect(isValidCron('70 * * * *')).toBe(false)
    expect(isValidCron('* * *')).toBe(false)

    expect(() => parseCron('1,2,3')).toThrow()
    expect(() => parseCron('*/0 * * * *')).toThrow()
    expect(() => parseCron('5-2 * * * *')).toThrow()
    expect(() => parseCron('100 * * * *')).toThrow()
    expect(() => parseCron('* * * * * *')).toThrow()
  })

  it('computes next run date correctly and handles day/month advances', () => {
    const baseDate = new Date(2026, 4, 1, 10, 0, 0)
    const nextDate = getNextCronDate('*/15 * * * *', baseDate)
    expect(nextDate.getMinutes()).toBe(15)

    const dailyDate = getNextCronDate('0 12 * * *', new Date(2026, 4, 1, 11, 0, 0))
    expect(dailyDate.getHours()).toBe(12)
    expect(dailyDate.getMinutes()).toBe(0)

    const specificMonthDate = getNextCronDate('0 0 1 12 *', new Date(2026, 4, 1, 0, 0, 0))
    expect(specificMonthDate.getMonth()).toBe(11)
    expect(specificMonthDate.getDate()).toBe(1)

    const specificDowDate = getNextCronDate('0 0 * * 0', new Date(2026, 4, 1, 0, 0, 0))
    expect(specificDowDate.getDay()).toBe(0)

    const specificHour = getNextCronDate('0 23 * * *', new Date(2026, 4, 1, 10, 0, 0))
    expect(specificHour.getHours()).toBe(23)
  })
})
