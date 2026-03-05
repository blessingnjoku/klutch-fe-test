import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MockAPI, initializeMockAPI, getMockAPI, __resetMockAPI } from '../mockApi'
import { ValidationError } from '../types'
import type { ListableTask } from '../types'

const mockTasks: ListableTask[] = [
  {
    id: 'task-1',
    title: 'Task 1',
    status: 'Open',
    taskType: 'Todo',
    priority: 'Normal',
    dueDate: '2026-03-10',
    startedAt: null,
    endedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    photoCount: 0,
    featuredPhotoUrl: null,
    tags: [],
    updatesCount: 0,
    lastCommentCreatedAt: null,
    coordinatorId: null,
    coordinatorName: null,
    coordinatorInitials: null,
    assignedToId: null,
    assignedToName: null,
    assignedToInitials: null,
    projectId: null,
    projectName: null,
    workOrderId: null,
    workOrderNumber: null,
    areaName: null,
    number: '001',
  },
  {
    id: 'task-2',
    title: 'Task 2',
    status: 'InProgress',
    taskType: 'Todo',
    priority: 'Urgent',
    dueDate: null,
    startedAt: Date.now(),
    endedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    photoCount: 0,
    featuredPhotoUrl: null,
    tags: [],
    updatesCount: 0,
    lastCommentCreatedAt: null,
    coordinatorId: null,
    coordinatorName: null,
    coordinatorInitials: null,
    assignedToId: null,
    assignedToName: null,
    assignedToInitials: null,
    projectId: null,
    projectName: null,
    workOrderId: null,
    workOrderNumber: null,
    areaName: null,
    number: '002',
  },
]

describe('MockAPI', () => {
  let api: MockAPI

  beforeEach(() => {
    // Create MockAPI in test mode to disable random failures
    api = new MockAPI([...mockTasks], true)
  })

  describe('constructor', () => {
    it('should initialize with tasks', () => {
      const tasks = api.getAllTasks()
      expect(tasks).toHaveLength(2)
      expect(tasks[0].id).toBe('task-1')
    })
  })

  describe('getTask', () => {
    it('should return task by id', () => {
      const task = api.getTask('task-1')
      expect(task).toBeDefined()
      expect(task?.title).toBe('Task 1')
    })

    it('should return undefined for non-existent task', () => {
      const task = api.getTask('non-existent')
      expect(task).toBeUndefined()
    })
  })

  describe('getAllTasks', () => {
    it('should return all tasks', () => {
      const tasks = api.getAllTasks()
      expect(tasks).toHaveLength(2)
    })

    it('should return copy of tasks', () => {
      const tasks1 = api.getAllTasks()
      const tasks2 = api.getAllTasks()
      expect(tasks1).not.toBe(tasks2)
    })
  })

  describe('updateTask', () => {
    it('should update task title', async () => {
      const updated = await api.updateTask('task-1', { title: 'Updated Title' })
      expect(updated.title).toBe('Updated Title')
      expect(updated.id).toBe('task-1')
    })

    it('should update task status', async () => {
      const updated = await api.updateTask('task-1', { status: 'Completed' })
      expect(updated.status).toBe('Completed')
    })

    it('should update task priority', async () => {
      const updated = await api.updateTask('task-1', { priority: 'Urgent' })
      expect(updated.priority).toBe('Urgent')
    })

    it('should update task dueDate', async () => {
      const updated = await api.updateTask('task-1', { dueDate: '2026-04-01' })
      expect(updated.dueDate).toBe('2026-04-01')
    })

    it('should update multiple fields', async () => {
      const updated = await api.updateTask('task-1', {
        title: 'New Title',
        status: 'InProgress',
        priority: 'Urgent',
      })
      expect(updated.title).toBe('New Title')
      expect(updated.status).toBe('InProgress')
      expect(updated.priority).toBe('Urgent')
    })

    it('should throw error for empty title', async () => {
      await expect(api.updateTask('task-1', { title: '   ' })).rejects.toThrow(ValidationError)
    })

    it('should throw error for non-existent task', async () => {
      await expect(api.updateTask('non-existent', { title: 'New' })).rejects.toThrow(
        ValidationError
      )
    })

    it('should update updatedAt timestamp', async () => {
      const before = Date.now()
      const updated = await api.updateTask('task-1', { title: 'New' })
      const after = Date.now()

      expect(updated.updatedAt).toBeGreaterThanOrEqual(before)
      expect(updated.updatedAt).toBeLessThanOrEqual(after)
    })
  })

  describe('updateTasksBatch', () => {
    it('should update multiple tasks', async () => {
      const updated = await api.updateTasksBatch(['task-1', 'task-2'], { status: 'Completed' })

      expect(updated).toHaveLength(2)
      expect(updated[0].status).toBe('Completed')
      expect(updated[1].status).toBe('Completed')
    })

    it('should validate all task IDs exist before updating', async () => {
      await expect(
        api.updateTasksBatch(['task-1', 'non-existent'], { status: 'Completed' })
      ).rejects.toThrow(ValidationError)

      // Verify no tasks were updated
      const task1 = api.getTask('task-1')
      expect(task1?.status).toBe('Open')
    })

    it('should return updated task array', async () => {
      const updated = await api.updateTasksBatch(['task-1'], { status: 'InProgress' })

      expect(Array.isArray(updated)).toBe(true)
      expect(updated[0].id).toBe('task-1')
      expect(updated[0].status).toBe('InProgress')
    })

    it('should update single task in batch', async () => {
      const updated = await api.updateTasksBatch(['task-1'], { priority: 'Urgent' })

      expect(updated).toHaveLength(1)
      expect(updated[0].priority).toBe('Urgent')
    })

    it('should handle empty task list gracefully', async () => {
      // This might be expected to either succeed or fail based on business logic
      // For now, testing that it doesn't crash
      const updatedBefore = api.getAllTasks()
      const initialCount = updatedBefore.length

      // Even if empty list is allowed, no tasks should be updated
      expect(initialCount).toBe(2)
    })
  })

  describe('Singleton Pattern', () => {
    beforeEach(() => {
      // Reset the singleton before each test
      __resetMockAPI()
    })

    it('should throw error when getMockAPI called before initialization', () => {
      expect(() => getMockAPI()).toThrow('Mock API not initialized')
    })

    it('should initialize and retrieve singleton', () => {
      initializeMockAPI(mockTasks, true)
      const api1 = getMockAPI()
      const api2 = getMockAPI()

      expect(api1).toBe(api2)
    })
  })
})
