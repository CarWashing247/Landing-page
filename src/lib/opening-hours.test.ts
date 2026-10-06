import { describe, expect, it } from 'vitest'

import type { BusinessInfo } from '../payload-types'
import { groupOpeningHours } from './opening-hours'

type Rows = BusinessInfo['openingHours']

const open = (day: string, opens = '07:30', closes = '21:00') =>
  ({ closed: false, closes, day, opens }) as never
const shut = (day: string) => ({ closed: true, day }) as never

describe('groupOpeningHours', () => {
  it('collapses consecutive days with the same hours into one run', () => {
    const rows = [open('monday'), open('tuesday'), open('wednesday')] as Rows

    expect(groupOpeningHours(rows)).toEqual([
      { days: ['monday', 'tuesday', 'wednesday'], hours: { closes: '21:00', opens: '07:30' } },
    ])
  })

  it('starts a new run when the hours change', () => {
    const rows = [open('monday'), open('tuesday', '08:00', '18:00')] as Rows

    expect(groupOpeningHours(rows).map((run) => run.days)).toEqual([['monday'], ['tuesday']])
  })

  it('groups by adjacency, not by value', () => {
    // Monday and Wednesday share hours but Tuesday does not, so this is three
    // runs. "Thứ Hai, Thứ Tư" skips a day and reads as a mistake.
    const rows = [open('monday'), open('tuesday', '08:00', '18:00'), open('wednesday')] as Rows

    expect(groupOpeningHours(rows)).toHaveLength(3)
  })

  it('groups consecutive closed days together', () => {
    const rows = [shut('saturday'), shut('sunday')] as Rows

    expect(groupOpeningHours(rows)).toEqual([{ days: ['saturday', 'sunday'], hours: null }])
  })

  it('does not merge a closed day into an open run', () => {
    const rows = [open('friday'), shut('saturday')] as Rows

    expect(groupOpeningHours(rows).map((run) => run.hours === null)).toEqual([false, true])
  })

  it('ignores the stored times on a day marked closed', () => {
    const rows = [{ closed: true, closes: '21:00', day: 'sunday', opens: '07:30' }] as Rows

    expect(groupOpeningHours(rows)).toEqual([{ days: ['sunday'], hours: null }])
  })

  it('drops an open day with a missing time rather than printing an empty range', () => {
    const rows = [open('monday'), { closed: false, day: 'tuesday', opens: '07:30' }] as Rows

    expect(groupOpeningHours(rows).flatMap((run) => run.days)).toEqual(['monday'])
  })

  it('does not let a dropped row join the runs on either side of it', () => {
    // Monday and Wednesday must not become one run just because Tuesday fell
    // out — they are no longer adjacent.
    const rows = [open('monday'), { closed: false, day: 'tuesday' }, open('wednesday')] as Rows

    expect(groupOpeningHours(rows).map((run) => run.days)).toEqual([['monday'], ['wednesday']])
  })

  it('does not mutate or reorder the stored array', () => {
    // T-14 reads the same array and still emits one entry per day; a grouping
    // that reached the source would make the two disagree.
    const rows = [open('monday'), open('tuesday')] as Rows
    const before = JSON.stringify(rows)

    groupOpeningHours(rows)

    expect(JSON.stringify(rows)).toBe(before)
  })

  it('returns nothing for absent hours', () => {
    expect(groupOpeningHours(null)).toEqual([])
    expect(groupOpeningHours([])).toEqual([])
  })
})
