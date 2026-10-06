import {
  formatDuration,
  formatTimeOfDay,
  nearestOption,
  parseTimeOfDay,
  timeOfDayOptions,
} from './time-of-day'

describe('parseTimeOfDay', () => {
  it.each([
    ['7p', '19:00'],
    ['7pm', '19:00'],
    ['7 PM', '19:00'],
    ['7:30 pm', '19:30'],
    ['7:30p.m.', '19:30'],
    ['730p', '19:30'],
    ['1930', '19:30'],
    ['19:30', '19:30'],
    ['10', '10:00'],
    ['10am', '10:00'],
    ['10:00 AM', '10:00'],
    ['12pm', '12:00'],
    ['12am', '00:00'],
    ['noon', '12:00'],
    ['4:30', '16:30'],
    ['7', '19:00'],
    ['8', '08:00'],
    ['0730', '07:30'],
  ])('reads %p as %p', (input, expected) => {
    expect(parseTimeOfDay(input)).toBe(expected)
  })

  it.each(['', 'abc', '25:00', '7:75', '13pm', '12345'])(
    'rejects %p',
    (input) => {
      expect(parseTimeOfDay(input)).toBeNull()
    }
  )
})

describe('formatTimeOfDay', () => {
  it('formats 12-hour times', () => {
    expect(formatTimeOfDay('19:30')).toBe('7:30 PM')
    expect(formatTimeOfDay('00:15')).toBe('12:15 AM')
    expect(formatTimeOfDay('12:00')).toBe('12:00 PM')
  })
})

describe('timeOfDayOptions', () => {
  it('lists every 15 minutes', () => {
    const options = timeOfDayOptions()
    expect(options).toHaveLength(96)
    expect(options.slice(0, 2)).toEqual(['00:00', '00:15'])
    expect(options.at(-1)).toBe('23:45')
  })
})

describe('formatDuration', () => {
  it('describes how long an event runs', () => {
    expect(formatDuration('19:00', '19:30')).toBe('30 min')
    expect(formatDuration('19:00', '20:00')).toBe('1 hr')
    expect(formatDuration('19:00', '20:30')).toBe('1.5 hrs')
    expect(formatDuration('19:00', '18:00')).toBeNull()
  })
})

describe('nearestOption', () => {
  it('finds the first option at or after a time', () => {
    expect(nearestOption(timeOfDayOptions(), '19:07')).toBe('19:15')
    expect(nearestOption(timeOfDayOptions(), '19:00')).toBe('19:00')
  })
})
