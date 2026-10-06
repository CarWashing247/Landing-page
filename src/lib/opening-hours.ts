import type { BusinessInfo } from '../payload-types'

/**
 * Opening hours, collapsed into the runs a human would read.
 *
 * `BusinessInfo` stores seven rows, one per weekday, because a missing day in
 * JSON-LD reads to Google as "closed" rather than "unknown" (see T-14). Printing
 * seven identical lines in a footer is correct and unreadable, so consecutive
 * days with the same hours are grouped here.
 *
 * **This is presentation and nothing else.** T-14's `openingHoursSpecification`
 * reads the same array independently and still emits one entry per day; the
 * grouping must never reach the stored shape, or the two will disagree about
 * what the business published. The function takes the array and returns a new
 * one — it does not sort, dedupe or normalise the source.
 *
 * Grouping is by *adjacency*, not by value: Monday and Wednesday sharing hours
 * while Tuesday differs stays three runs, because "Thứ Hai, Thứ Tư" skips a day
 * and reads as a mistake.
 */

type Row = NonNullable<BusinessInfo['openingHours']>[number]

/** A run of consecutive days sharing the same hours. */
export type HoursRun = {
  /** The days in the run, in stored order. */
  readonly days: Row['day'][]
  /** `null` when the run is closed. */
  readonly hours: null | { closes: string; opens: string }
}

/** Two rows are the same if both are closed, or both open at the same times. */
const sameHours = (a: Row, b: Row): boolean => {
  if (a.closed === true || b.closed === true) {
    return a.closed === true && b.closed === true
  }

  return a.opens === b.opens && a.closes === b.closes
}

/**
 * A row with no times is dropped rather than printed as an empty range. The
 * field validation in `BusinessInfo` makes that unreachable through the admin;
 * this is the backstop for a row written by an API call.
 */
const hoursOf = (row: Row): HoursRun['hours'] | undefined => {
  if (row.closed === true) {
    return null
  }

  return row.opens && row.closes ? { closes: row.closes, opens: row.opens } : undefined
}

export const groupOpeningHours = (rows: BusinessInfo['openingHours']): HoursRun[] => {
  const runs: HoursRun[] = []
  let previous: Row | undefined

  for (const row of rows ?? []) {
    const hours = hoursOf(row)

    if (hours === undefined) {
      previous = undefined
      continue
    }

    if (previous && sameHours(previous, row)) {
      runs[runs.length - 1]!.days.push(row.day)
    } else {
      runs.push({ days: [row.day], hours })
    }

    previous = row
  }

  return runs
}
