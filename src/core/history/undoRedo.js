export class UndoRedoManager {
  constructor(initialState = null, maxHistory = 50) {
    this.past = []
    this.future = []
    this.present = initialState ? this.clone(initialState) : null
    this.maxHistory = maxHistory
    this.isGrouping = false
    this.groupInitialState = null
  }

  clone(state) {
    return JSON.parse(JSON.stringify(state))
  }

  setInitial(state) {
    this.present = this.clone(state)
    this.past = []
    this.future = []
  }

  startGroup() {
    if (!this.isGrouping) {
      this.isGrouping = true
      this.groupInitialState = this.clone(this.present)
    }
  }

  endGroup(finalState) {
    if (this.isGrouping) {
      this.isGrouping = false
      if (this.groupInitialState && finalState) {
        const hasChanged = JSON.stringify(this.groupInitialState) !== JSON.stringify(finalState)
        if (hasChanged) {
          this.past.push(this.groupInitialState)
          if (this.past.length > this.maxHistory) {
            this.past.shift()
          }
          this.present = this.clone(finalState)
          this.future = []
        }
      }
      this.groupInitialState = null
    }
  }

  push(nextState) {
    if (this.isGrouping) {
      this.present = this.clone(nextState)
      return
    }

    if (!this.present) {
      this.present = this.clone(nextState)
      return
    }

    const hasChanged = JSON.stringify(this.present) !== JSON.stringify(nextState)
    if (!hasChanged) {
      return
    }

    this.past.push(this.present)
    if (this.past.length > this.maxHistory) {
      this.past.shift()
    }

    this.present = this.clone(nextState)
    this.future = []
  }

  canUndo() {
    return this.past.length > 0
  }

  canRedo() {
    return this.future.length > 0
  }

  undo() {
    if (!this.canUndo()) return null

    const previous = this.past.pop()
    this.future.push(this.present)
    this.present = previous
    return this.clone(this.present)
  }

  redo() {
    if (!this.canRedo()) return null

    const next = this.future.pop()
    this.past.push(this.present)
    this.present = next
    return this.clone(this.present)
  }

  getCurrent() {
    return this.present ? this.clone(this.present) : null
  }

  clear() {
    this.past = []
    this.future = []
  }
}
