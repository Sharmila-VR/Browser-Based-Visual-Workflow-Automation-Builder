import { describe, it, expect } from 'vitest'
import { WorkflowScheduler } from '../src/core/execution/scheduler.js'

describe('Workflow Scheduler & Tab Throttling Recovery', () => {
  it('registers and triggers scheduled workflows', async () => {
    let triggeredId = null
    const scheduler = new WorkflowScheduler((id) => {
      triggeredId = id
    })

    const nextRun = scheduler.registerSchedule('wf_test_1', 1, { test: true })
    expect(nextRun).toBeInstanceOf(Date)
    const schedule = scheduler.getSchedule('wf_test_1')
    expect(schedule).toBeDefined()
    expect(schedule.enabled).toBe(true)

    schedule.nextRun = new Date(Date.now() - 5000)
    scheduler.handleVisibilityChange()
    expect(triggeredId).toBe('wf_test_1')

    scheduler.registerSchedule('wf_test_cron', '*/5 * * * *')
    const cronSchedule = scheduler.getSchedule('wf_test_cron')
    expect(cronSchedule).toBeDefined()
    cronSchedule.nextRun = new Date(Date.now() - 1000)
    scheduler.tick()

    scheduler.unregisterSchedule('wf_test_1')
    expect(scheduler.getSchedule('wf_test_1')).toBeUndefined()

    expect(() => scheduler.registerSchedule('invalid_wf', 'invalid_cron')).toThrow()

    scheduler.destroy()
    expect(scheduler.schedules.size).toBe(0)
  })
})
