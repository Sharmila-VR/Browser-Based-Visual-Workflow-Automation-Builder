const SHORTCUTS = {
  '@hourly': '0 * * * *',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@weekly': '0 0 * * 0',
  '@monthly': '0 0 1 * *',
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *'
}

function parseField(field, min, max) {
  const values = new Set()
  const parts = field.split(',')

  for (const part of parts) {
    if (part.includes('/')) {
      const [rangePart, stepPart] = part.split('/')
      const step = parseInt(stepPart, 10)
      if (isNaN(step) || step <= 0) {
        throw new Error(`Invalid step value: ${stepPart}`)
      }

      let start = min
      let end = max
      if (rangePart !== '*') {
        if (rangePart.includes('-')) {
          const [rStart, rEnd] = rangePart.split('-').map((n) => parseInt(n, 10))
          if (!isNaN(rStart)) start = rStart
          if (!isNaN(rEnd)) end = rEnd
        } else {
          start = parseInt(rangePart, 10)
        }
      }

      for (let i = start; i <= end; i += step) {
        if (i >= min && i <= max) values.add(i)
      }
    } else if (part.includes('-')) {
      const [rStart, rEnd] = part.split('-').map((n) => parseInt(n, 10))
      if (isNaN(rStart) || isNaN(rEnd) || rStart > rEnd) {
        throw new Error(`Invalid range: ${part}`)
      }
      for (let i = rStart; i <= rEnd; i++) {
        if (i >= min && i <= max) values.add(i)
      }
    } else if (part === '*') {
      for (let i = min; i <= max; i++) {
        values.add(i)
      }
    } else {
      const num = parseInt(part, 10)
      if (isNaN(num) || num < min || num > max) {
        throw new Error(`Value ${part} outside allowed range [${min}, ${max}]`)
      }
      values.add(num)
    }
  }

  return Array.from(values).sort((a, b) => a - b)
}

export function parseCron(cronString) {
  const normalized = SHORTCUTS[cronString.trim()] || cronString.trim()
  const fields = normalized.split(/\s+/)

  if (fields.length !== 5) {
    throw new Error(`Cron expression must have 5 fields, got ${fields.length}`)
  }

  const [minStr, hourStr, domStr, monthStr, dowStr] = fields

  const minutes = parseField(minStr, 0, 59)
  const hours = parseField(hourStr, 0, 23)
  const daysOfMonth = parseField(domStr, 1, 31)
  const months = parseField(monthStr, 1, 12)
  const daysOfWeek = parseField(dowStr, 0, 6)

  return { minutes, hours, daysOfMonth, months, daysOfWeek }
}

export function isValidCron(cronString) {
  try {
    parseCron(cronString)
    return true
  } catch {
    return false
  }
}

export function getNextCronDate(cronString, fromDate = new Date()) {
  const parsed = parseCron(cronString)
  const date = new Date(fromDate.getTime())
  date.setSeconds(0, 0)
  date.setMinutes(date.getMinutes() + 1)

  const maxChecks = 525600
  let checks = 0

  while (checks < maxChecks) {
    checks++

    const month = date.getMonth() + 1
    if (!parsed.months.includes(month)) {
      date.setMonth(date.getMonth() + 1, 1)
      date.setHours(0, 0, 0, 0)
      continue
    }

    const dayOfMonth = date.getDate()
    const dayOfWeek = date.getDay()
    if (!parsed.daysOfMonth.includes(dayOfMonth) || !parsed.daysOfWeek.includes(dayOfWeek)) {
      date.setDate(date.getDate() + 1)
      date.setHours(0, 0, 0, 0)
      continue
    }

    const hour = date.getHours()
    if (!parsed.hours.includes(hour)) {
      date.setHours(date.getHours() + 1, 0, 0, 0)
      continue
    }

    const minute = date.getMinutes()
    if (!parsed.minutes.includes(minute)) {
      date.setMinutes(date.getMinutes() + 1, 0, 0)
      continue
    }

    return date
  }

  throw new Error('Could not find next matching cron date within 1 year')
}
