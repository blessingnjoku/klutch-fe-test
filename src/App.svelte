<script lang="ts">
  import {onMount} from 'svelte'
  import type {ListableTask, TaskTableColumnConfig, TaskStatus} from './types'
  import {MOCK_TASKS} from './mockData'
  import {initializeMockAPI, getMockAPI} from './mockApi'
  import TaskTableRow from './components/TaskTableRow.svelte'

  let tasks: ListableTask[] = []
  let selectedTaskIds = new Set<string>()
  
  let isLoadingBatch = false
  let batchError = ''
  let selectedBatchStatus: TaskStatus | '' = ''

  let lastSelectedIndex = -1

  const columnConfig: TaskTableColumnConfig = {
    showCheckbox: true,
    showStatus: true,
    showPriority: true,
    showNumber: true,
    showTitle: true,
    showProjectName: true,
    showDueDate: true,
    showCoordinator: true,
    showAssignedTo: true,
    showUpdates: true,
    showTags: true,
    showWorkOrder: true,
    showArea: true,
  }

  const taskStatusOptions: TaskStatus[] = ['Open', 'InProgress', 'InReview', 'Completed', 'Canceled']

  onMount(() => {
    initializeMockAPI(MOCK_TASKS)
    const api = getMockAPI()
    tasks = api.getAllTasks()
  })

  function handleTaskSelected(event: CustomEvent<ListableTask>): void {
    console.log('Task selected:', event.detail)
    alert(`Opened task: ${event.detail.title}`)
  }

  function handleTaskUpdated(event: CustomEvent<ListableTask>): void {
    const updatedTask = event.detail
    tasks = tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
  }

  function handleCheckboxChange(event: CustomEvent<{
    taskId: string
    selected: boolean
    shiftKey: boolean
    rowIndex?: number
  }>): void {
    const {taskId, selected, shiftKey, rowIndex = -1} = event.detail

    if (shiftKey && lastSelectedIndex >= 0 && rowIndex >= 0) {
      const startIndex = Math.min(lastSelectedIndex, rowIndex)
      const endIndex = Math.max(lastSelectedIndex, rowIndex)

      for (let i = startIndex; i <= endIndex; i++) {
        if (i < tasks.length) {
          if (selected) {
            selectedTaskIds.add(tasks[i].id)
          } else {
            selectedTaskIds.delete(tasks[i].id)
          }
        }
      }
    } else {
      if (selected) {
        selectedTaskIds.add(taskId)
      } else {
        selectedTaskIds.delete(taskId)
      }
    }

    if (rowIndex >= 0) {
      lastSelectedIndex = rowIndex
    }

    selectedTaskIds = selectedTaskIds // Trigger reactivity
  }

  function selectAll(): void {
    selectedTaskIds = new Set(tasks.map(t => t.id))
  }

  function clearSelection(): void {
    selectedTaskIds = new Set()
    lastSelectedIndex = -1
  }

  async function handleBatchStatusUpdate(): Promise<void> {
    if (!selectedBatchStatus || selectedTaskIds.size === 0) {
      return
    }

    isLoadingBatch = true
    batchError = ''

    const originalTasks = tasks
    const selectedIds = Array.from(selectedTaskIds)

    try {
      const optimisticTasks = tasks.map(t =>
        selectedIds.includes(t.id)
          ? {...t, status: selectedBatchStatus, updatedAt: Date.now()}
          : t
      )
      tasks = optimisticTasks

      const api = getMockAPI()
      const updatedTasks = await api.updateTasksBatch(
        selectedIds,
        { status: selectedBatchStatus }
      )

      const updatedMap = new Map(updatedTasks.map(t => [t.id, t]))
      tasks = tasks.map(t => updatedMap.has(t.id) ? updatedMap.get(t.id)! : t)

      clearSelection()
      selectedBatchStatus = ''
    } catch (error) {
      batchError = error instanceof Error ? error.message : 'Failed to update tasks'
      tasks = originalTasks
    } finally {
      isLoadingBatch = false
    }
  }

  function cancelBatchOperation(): void {
    selectedBatchStatus = ''
    batchError = ''
  }

  function handleBatchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (selectedBatchStatus) {
        handleBatchStatusUpdate()
      }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      cancelBatchOperation()
    }
  }

  $: isSelectColumnVisible = selectedTaskIds.size > 0 || true
</script>

<div class="p-4">
  <div class="flex items-center justify-between gap-4" style="margin-bottom: 1rem;">
    <h1 style="font-size: 1.5rem; font-weight: 600; margin: 0;">
      Task Management Table
    </h1>
    <div class="flex gap-2">
      <button on:click={selectAll}>Select All</button>
      <button on:click={clearSelection}>Clear Selection</button>
    </div>
  </div>

  {#if selectedTaskIds.size > 0}
    <div class="p-4 bg-white border rounded-lg" style="margin-bottom: 1rem;" on:keydown={handleBatchKeydown}>
      <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
        <div style="flex: 1;">
          <strong>✓ {selectedTaskIds.size}</strong> task{selectedTaskIds.size === 1 ? '' : 's'} selected
        </div>

        {#if selectedBatchStatus === ''}
          <select
            bind:value={selectedBatchStatus}
            disabled={isLoadingBatch}
            style="padding: 0.5rem 1rem; border: 1px solid #e4e4e7; border-radius: 0.375rem; background: white; cursor: pointer;"
            title="Select a status or press Escape to cancel"
          >
            <option value="">Change Status...</option>
            {#each taskStatusOptions as status}
              <option value={status}>{status}</option>
            {/each}
          </select>
        {:else}
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <span style="font-weight: 500;">Set to <strong>{selectedBatchStatus}</strong>?</span>
            <button
              on:click={handleBatchStatusUpdate}
              disabled={isLoadingBatch}
              style="padding: 0.5rem 1rem; background: #10b981; color: white; border: none; border-radius: 0.375rem; cursor: pointer;"
              title="Confirm (or press Enter)"
            >
              {isLoadingBatch ? 'Updating...' : 'Confirm'}
            </button>
            <button
              on:click={cancelBatchOperation}
              disabled={isLoadingBatch}
              style="padding: 0.5rem 1rem; background: #ef4444; color: white; border: none; border-radius: 0.375rem; cursor: pointer;"
              title="Cancel (or press Escape)"
            >
              Cancel
            </button>
          </div>
        {/if}
      </div>

      {#if batchError}
        <div style="color: #dc2626; font-size: 0.875rem; margin-top: 0.5rem;">
          ⚠️ {batchError}
        </div>
      {/if}
    </div>
  {/if}

  <div class="rounded-lg shadow" style="overflow-x: auto;">
    <table>
      <thead>
        <tr>
          {#if columnConfig.showCheckbox}
            <th style="width: 50px; text-align: center;">
              <input
                type="checkbox"
                checked={selectedTaskIds.size === tasks.length && tasks.length > 0}
                indeterminate={selectedTaskIds.size > 0 && selectedTaskIds.size < tasks.length}
                on:change={(e) => {
                  if (e.currentTarget.checked) {
                    selectAll()
                  } else {
                    clearSelection()
                  }
                }}
              />
            </th>
          {/if}
          {#if columnConfig.showStatus}<th style="width: 80px;">Status</th>{/if}
          {#if columnConfig.showPriority}<th style="width: 80px;">Priority</th>{/if}
          {#if columnConfig.showNumber}<th style="width: 100px;">Number</th>{/if}
          {#if columnConfig.showTitle}<th>Title</th>{/if}
          {#if columnConfig.showProjectName}<th style="width: 180px;">Project</th>{/if}
          {#if columnConfig.showDueDate}<th style="width: 120px;">Due Date</th>{/if}
          {#if columnConfig.showCoordinator}<th style="width: 80px;">Coordinator</th>{/if}
          {#if columnConfig.showAssignedTo}<th style="width: 120px;">Assigned To</th>{/if}
          {#if columnConfig.showUpdates}<th style="width: 120px;">Updates</th>{/if}
          {#if columnConfig.showTags}<th style="width: 150px;">Tags</th>{/if}
          {#if columnConfig.showWorkOrder}<th style="width: 120px;">Work Order</th>{/if}
          {#if columnConfig.showArea}<th style="width: 120px;">Area</th>{/if}
        </tr>
      </thead>
      <tbody>
        {#each tasks as task, index (task.id)}
          <TaskTableRow
            {task}
            {columnConfig}
            isSelected={selectedTaskIds.has(task.id)}
            {isSelectColumnVisible}
            rowIndex={index}
            on:selected={handleTaskSelected}
            on:updated={handleTaskUpdated}
            on:checkboxSelectionChange={handleCheckboxChange}
          />
        {/each}
      </tbody>
    </table>
  </div>

  <div class="p-4 bg-white border rounded-lg" style="margin-top: 2rem;">
    <h2 style="font-size: 1.25rem; font-weight: 600; margin-top: 0;">✅ Tasks Completed</h2>
    <ul style="line-height: 1.8;">
      <li><strong>Task 1 - Inline Editing:</strong> Click on any task title to edit it. Press Enter to save or Escape to cancel. Changes are saved to the Mock API with error handling.</li>
      <li><strong>Task 2 - Batch Operations:</strong> Select multiple tasks using checkboxes. Use the "Change Status..." dropdown to update all selected tasks at once. The batch update validates all IDs exist before making changes.</li>
    </ul>

    <h3 style="font-size: 1rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.5rem;">✨ Bonus Features</h3>
    <ul style="line-height: 1.8;">
      <li><strong>Shift+Click Range Selection:</strong> Hold Shift and click a checkbox to select all tasks between the last selected task and the current one.</li>
      <li><strong>Keyboard Navigation:</strong>
        <ul style="margin-top: 0.5rem; margin-left: 1.5rem;">
          <li><strong>Tab:</strong> Navigate through checkboxes, title fields, and buttons</li>
          <li><strong>Enter:</strong> Activate title edit mode, confirm batch updates</li>
          <li><strong>Space:</strong> Toggle checkboxes, activate buttons</li>
          <li><strong>Escape:</strong> Cancel title edits, dismiss batch operation prompts</li>
        </ul>
      </li>
    </ul>

    <p style="margin-top: 1rem; color: #52525b;">
      <strong>Features:</strong> Mock API has 10% failure rate and 200-600ms delays. Loading states and error messages provide clear feedback. Selected tasks are cleared after batch update.
    </p>
  </div>
</div>
