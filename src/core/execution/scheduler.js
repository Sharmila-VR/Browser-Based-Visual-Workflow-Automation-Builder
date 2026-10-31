import { getNextCronDate, isValidCron } from './cron.js'

export class WorkflowScheduler {
  constructor(onTrigger) {
    this.onTrigger = onTrigger
    this.schedules = new Map()
    this.timerId = null
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this)
    this.tick = this.tick.bind(this)

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange)
    }
    this.startHeartbeat()
  }

  startHeartbeat() {
    if (this.timerId) return
    this.timerId = setInterval(this.tick, 1000)
  }

  stopHeartbeat() {
    if (this.timerId) {
      clearInterval(this.timerId)
      this.timerId = null
    }
  }

  registerSchedule(workflowId, cronOrInterval, payload = {}) {
    let nextRun = null
    const now = new Date()

    if (typeof cronOrInterval === 'number') {
      nextRun = new Date(now.getTime() + cronOrInterval * 1000)
    } else if (typeof cronOrInterval === 'string' && isValidCron(cronOrInterval)) {
      nextRun = getNextCronDate(cronOrInterval, now)
    } else {
      throw new Error(`Invalid schedule expression: ${cronOrInterval}`)
    }

    this.schedules.set(workflowId, {
      expression: cronOrInterval,
      nextRun,
      payload,
      lastRun: null,
      enabled: true
    })

    return nextRun
  }

  unregisterSchedule(workflowId) {
    this.schedules.delete(workflowId)
  }

  handleVisibilityChange() {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      this.checkDueSchedules()
    }
  }

  tick() {
    this.checkDueSchedules()
  }

  checkDueSchedules() {
    const now = new Date()

    for (const [id, schedule] of this.schedules.entries()) {
      if (!schedule.enabled || !schedule.nextRun) continue

      if (now >= schedule.nextRun) {
        schedule.lastRun = new Date(now.getTime())

        if (typeof schedule.expression === 'number') {
          schedule.nextRun = new Date(now.getTime() + schedule.expression * 1000)
        } else if (isValidCron(schedule.expression)) {
          schedule.nextRun = getNextCronDate(schedule.expression, now)
        }

        if (this.onTrigger) {
          try {
            this.onTrigger(id, schedule.payload)
          } catch (err) {
            console.error(`Scheduled execution failed for workflow ${id}:`, err)
          }
        }
      }
    }
  }

  getSchedule(workflowId) {
    return this.schedules.get(workflowId)
  }

  destroy() {
    this.stopHeartbeat()
    this.schedules.clear()
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    }
  }
}
