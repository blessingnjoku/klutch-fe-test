import type {ListableTask, UpdateTaskPayload} from './types'
import {ValidationError} from './types'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const shouldFail = () => Math.random() < 0.1

export class MockAPI {
  private tasks: Map<string, ListableTask> = new Map()
  private testMode: boolean = false

  constructor(initialTasks: ListableTask[], testMode: boolean = false) {
    initialTasks.forEach(task => this.tasks.set(task.id, task))
    this.testMode = testMode
  }

  async updateTask(taskId: string, payload: UpdateTaskPayload): Promise<ListableTask> {
    await delay(200 + Math.random() * 400)

    if (!this.testMode && shouldFail()) {
      throw new ValidationError(['Network error: Unable to save changes'])
    }

    const task = this.tasks.get(taskId)
    if (!task) {
      throw new ValidationError(['Task not found'])
    }

    if (payload.title !== undefined && payload.title.trim().length === 0) {
      throw new ValidationError(['Title cannot be empty'])
    }

    const updatedTask: ListableTask = {
      ...task,
      ...payload,
      updatedAt: Date.now(),
    }

    this.tasks.set(taskId, updatedTask)

    console.log('✅ Mock API: Updated task', taskId, payload)

    return updatedTask
  }

  async updateTasksBatch(
    taskIds: string[],
    updates: Partial<ListableTask>
  ): Promise<ListableTask[]> {
    await delay(200 + Math.random() * 400)

    if (!this.testMode && shouldFail()) {
      throw new ValidationError(['Network error: Unable to save changes'])
    }

    for (const taskId of taskIds) {
      if (!this.tasks.has(taskId)) {
        throw new ValidationError([`Task with ID "${taskId}" not found`])
      }
    }

    const updatedTasks: ListableTask[] = []
    for (const taskId of taskIds) {
      const task = this.tasks.get(taskId)!
      const updatedTask: ListableTask = {
        ...task,
        ...updates,
        updatedAt: Date.now(),
      }
      this.tasks.set(taskId, updatedTask)
      updatedTasks.push(updatedTask)
    }

    console.log('✅ Mock API: Batch updated', taskIds.length, 'tasks', updates)

    return updatedTasks
  }

  getTask(taskId: string): ListableTask | undefined {
    return this.tasks.get(taskId)
  }

  getAllTasks(): ListableTask[] {
    return Array.from(this.tasks.values())
  }
}

let apiInstance: MockAPI | null = null

export function initializeMockAPI(tasks: ListableTask[], testMode: boolean = false): void {
  apiInstance = new MockAPI(tasks, testMode)
}

export function getMockAPI(): MockAPI {
  if (!apiInstance) {
    throw new Error('Mock API not initialized. Call initializeMockAPI() first.')
  }
  return apiInstance
}

export function __resetMockAPI(): void {
  apiInstance = null
}
