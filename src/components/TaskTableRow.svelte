<script lang="ts">
  import {createEventDispatcher} from 'svelte'
  import type {ListableTask, TaskTableColumnConfig, TaskStatus, TaskPriority} from '../types'
  import Tr from './stubs/Tr.svelte'
  import Td from './stubs/Td.svelte'
  import StatusBadge from './stubs/StatusBadge.svelte'
  import UserAvatar from './stubs/UserAvatar.svelte'
  import Pill from './stubs/Pill.svelte'
  import MediaThumbnail from './stubs/MediaThumbnail.svelte'
  import {formatDisplayDate} from '../utils'
  import {getMockAPI} from '../mockApi'

  export let task: ListableTask
  export let columnConfig: TaskTableColumnConfig
  export let isSelected: boolean = false
  export let isSelectColumnVisible: boolean = true
  export let rowIndex: number = 0

  const dispatch = createEventDispatcher<{
    selected: ListableTask
    updated: ListableTask
    checkboxSelectionChange: {
      taskId: string
      selected: boolean
      shiftKey: boolean
      rowIndex: number
    }
  }>()


  let isEditing = false
  let editingTitle = task.title
  let isLoading = false
  let errorMessage = ''
  let inputElement: HTMLInputElement
  let originalTask = task

  let editingField: 'status' | 'priority' | 'dueDate' | null = null
  let editingValue: string = ''

  const statusOptions: TaskStatus[] = ['Open', 'InProgress', 'InReview', 'Completed', 'Canceled']
  const priorityOptions: TaskPriority[] = ['Normal', 'Urgent']

  function handleClick(): void {
    dispatch('selected', task)
  }

  function handleCheckboxChange(event: Event): void {
    const target = event.target as HTMLInputElement
    const mouseEvent = event as MouseEvent & {currentTarget: HTMLInputElement}

    dispatch('checkboxSelectionChange', {
      taskId: task.id,
      selected: target.checked,
      shiftKey: mouseEvent.shiftKey || false,
      rowIndex,
    })
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (event.target === document.activeElement || (event.target as HTMLElement)?.closest?.('[role="button"]')) {
        (document.activeElement as HTMLElement)?.blur?.()
      }
    }
  }

  function handleTitleClick(event: Event): void {
    event.stopPropagation()
    isEditing = true
    editingTitle = task.title
    errorMessage = ''
    setTimeout(() => {
      inputElement?.focus()
      inputElement?.select()
    }, 0)
  }

  async function handleSaveTitle(): Promise<void> {
    if (editingTitle.trim() === task.title) {
      isEditing = false
      return
    }

    isLoading = true
    errorMessage = ''

    const originalTitle = task.title
    const originalTaskState = {...task}

    try {
      task = {...task, title: editingTitle.trim(), updatedAt: Date.now()}
      dispatch('updated', task)

      const api = getMockAPI()
      const updatedTask = await api.updateTask(task.id, {
        title: editingTitle.trim(),
      })

      task = updatedTask
      dispatch('updated', updatedTask)
      isEditing = false
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Failed to save changes'
      task = originalTaskState
      editingTitle = originalTitle
      dispatch('updated', originalTaskState) // Notify parent to revert
    } finally {
      isLoading = false
    }
  }

  function handleCancelEdit(): void {
    isEditing = false
    editingTitle = task.title
    errorMessage = ''
  }

  function handleTitleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSaveTitle()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      handleCancelEdit()
    }
  }

  function startEditField(field: 'status' | 'priority' | 'dueDate', value: string): void {
    event?.stopPropagation()
    editingField = field
    editingValue = value
  }

  async function saveFieldEdit(field: 'status' | 'priority' | 'dueDate'): Promise<void> {
    if (!editingValue) {
      editingField = null
      return
    }

    isLoading = true
    errorMessage = ''
    const originalTaskState = {...task}
    const updatePayload: any = {}

    try {
      if (field === 'status') {
        task = {...task, status: editingValue as TaskStatus, updatedAt: Date.now()}
        updatePayload.status = editingValue
      } else if (field === 'priority') {
        task = {...task, priority: editingValue as TaskPriority, updatedAt: Date.now()}
        updatePayload.priority = editingValue
      } else if (field === 'dueDate') {
        task = {...task, dueDate: editingValue || null, updatedAt: Date.now()}
        updatePayload.dueDate = editingValue || null
      }

      dispatch('updated', task)

      const api = getMockAPI()
      const updatedTask = await api.updateTask(task.id, updatePayload)

      task = updatedTask
      dispatch('updated', updatedTask)
      editingField = null
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Failed to update'
      task = originalTaskState
      dispatch('updated', originalTaskState)
    } finally {
      isLoading = false
    }
  }

  function cancelFieldEdit(): void {
    editingField = null
    editingValue = ''
    errorMessage = ''
  }

</script>

<Tr on:click={handleClick} on:keydown={handleKeyDown} role="row" tabindex="0">
  {#if isSelectColumnVisible && columnConfig.showCheckbox}
    <Td
      style="text-align: center; padding: 0.5rem;"
      on:click={(e) => {
        e.stopPropagation()
      }}
    >
      <input
        type="checkbox"
        checked={isSelected}
        on:change={handleCheckboxChange}
        on:click={(e) => {
          e.stopPropagation()
        }}
      />
    </Td>
  {/if}

  {#if columnConfig.showStatus}
    <Td style="padding: 0.5rem;">
      {#if editingField === 'status'}
        <div style="display: flex; gap: 0.5rem; align-items: center;" on:click={(e) => e.stopPropagation()}>
          <select
            bind:value={editingValue}
            disabled={isLoading}
            style="padding: 0.375rem 0.5rem; border: 1px solid #e4e4e7; border-radius: 0.375rem;"
          >
            {#each statusOptions as status}
              <option value={status}>{status}</option>
            {/each}
          </select>
          <button
            on:click={() => saveFieldEdit('status')}
            disabled={isLoading}
            style="padding: 0.375rem 0.5rem; background: #10b981; color: white; border: none; border-radius: 0.25rem; cursor: pointer; font-size: 0.75rem;"
          >
            ✓
          </button>
          <button
            on:click={cancelFieldEdit}
            disabled={isLoading}
            style="padding: 0.375rem 0.5rem; background: #ef4444; color: white; border: none; border-radius: 0.25rem; cursor: pointer; font-size: 0.75rem;"
          >
            ✕
          </button>
        </div>
      {:else}
        <span
          style="cursor: pointer; padding: 0.25rem 0.5rem; border-radius: 0.25rem;"
          on:click={() => startEditField('status', task.status)}
          role="button"
          tabindex="0"
          title="Click to edit status"
        >
          <StatusBadge status={task.status} />
        </span>
      {/if}
    </Td>
  {/if}

  {#if columnConfig.showPriority}
    <Td style="padding: 0.5rem;">
      {#if editingField === 'priority'}
        <div style="display: flex; gap: 0.5rem; align-items: center;" on:click={(e) => e.stopPropagation()}>
          <select
            bind:value={editingValue}
            disabled={isLoading}
            style="padding: 0.375rem 0.5rem; border: 1px solid #e4e4e7; border-radius: 0.375rem;"
          >
            {#each priorityOptions as priority}
              <option value={priority}>{priority}</option>
            {/each}
          </select>
          <button
            on:click={() => saveFieldEdit('priority')}
            disabled={isLoading}
            style="padding: 0.375rem 0.5rem; background: #10b981; color: white; border: none; border-radius: 0.25rem; cursor: pointer; font-size: 0.75rem;"
          >
            ✓
          </button>
          <button
            on:click={cancelFieldEdit}
            disabled={isLoading}
            style="padding: 0.375rem 0.5rem; background: #ef4444; color: white; border: none; border-radius: 0.25rem; cursor: pointer; font-size: 0.75rem;"
          >
            ✕
          </button>
        </div>
      {:else}
        <span
          style="cursor: pointer; padding: 0.25rem 0.5rem; border-radius: 0.25rem; background: {task.priority === 'Urgent' ? '#fee2e2' : '#f0fdf4'}; color: {task.priority === 'Urgent' ? '#991b1b' : '#166534'}; font-size: 0.75rem; font-weight: 500; border-radius: 0.25rem;"
          on:click={() => startEditField('priority', task.priority)}
          role="button"
          tabindex="0"
          title="Click to edit priority"
        >
          {task.priority}
        </span>
      {/if}
    </Td>
  {/if}

  {#if columnConfig.showNumber}
    <Td style="padding: 0.5rem;">
      <span style="font-family: monospace; color: #71717a;">{task.number}</span>
    </Td>
  {/if}

  {#if columnConfig.showTitle}
    <Td style="padding: 0.5rem;">
      {#if isEditing}
        <div style="display: flex; align-items: center; gap: 0.5rem;" on:click={(e) => e.stopPropagation()}>
          <input
            bind:this={inputElement}
            bind:value={editingTitle}
            on:keydown={handleTitleKeyDown}
            type="text"
            placeholder="Enter title..."
            disabled={isLoading}
            style="flex: 1; padding: 0.375rem 0.5rem; border: 1px solid #e4e4e7; border-radius: 0.375rem; font-size: 0.875rem;"
          />
          <button
            on:click={handleSaveTitle}
            disabled={isLoading}
            style="padding: 0.375rem 0.75rem; background: #10b981; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem; min-width: 60px;"
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
          <button
            on:click={handleCancelEdit}
            disabled={isLoading}
            style="padding: 0.375rem 0.75rem; background: #ef4444; color: white; border: none; border-radius: 0.375rem; cursor: pointer; font-size: 0.875rem; min-width: 70px;"
          >
            Cancel
          </button>
        </div>
        {#if errorMessage}
          <div style="color: #dc2626; font-size: 0.75rem; margin-top: 0.25rem;">
            ⚠️ {errorMessage}
          </div>
        {/if}
      {:else}
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          {#if task.photoCount > 0}
            <MediaThumbnail
              src={task.featuredPhotoUrl}
              alt={task.title}
              photoCount={task.photoCount}
              on:click={(e) => {
                e.stopPropagation()
                alert(`View ${task.photoCount} photo${task.photoCount > 1 ? 's' : ''}`)
              }}
            />
          {/if}
          <span
            style="cursor: pointer; padding: 0.25rem 0.5rem; border-radius: 0.25rem; user-select: none; hover:background: #f3f4f6;"
            on:click={handleTitleClick}
            on:keydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleTitleClick(e)
              }
            }}
            role="button"
            tabindex="0"
            title="Click to edit (or press Enter)"
          >
            {task.title}
          </span>
        </div>
      {/if}
    </Td>
  {/if}

  {#if columnConfig.showProjectName}
    <Td style="padding: 0.5rem;">
      {task.projectName}
    </Td>
  {/if}

  {#if columnConfig.showDueDate}
    <Td style="padding: 0.5rem;">
      {#if editingField === 'dueDate'}
        <div style="display: flex; gap: 0.5rem; align-items: center;" on:click={(e) => e.stopPropagation()}>
          <input
            bind:value={editingValue}
            disabled={isLoading}
            type="date"
            style="padding: 0.375rem 0.5rem; border: 1px solid #e4e4e7; border-radius: 0.375rem; font-size: 0.875rem;"
          />
          <button
            on:click={() => saveFieldEdit('dueDate')}
            disabled={isLoading}
            style="padding: 0.375rem 0.5rem; background: #10b981; color: white; border: none; border-radius: 0.25rem; cursor: pointer; font-size: 0.75rem;"
          >
            ✓
          </button>
          <button
            on:click={cancelFieldEdit}
            disabled={isLoading}
            style="padding: 0.375rem 0.5rem; background: #ef4444; color: white; border: none; border-radius: 0.25rem; cursor: pointer; font-size: 0.75rem;"
          >
            ✕
          </button>
        </div>
      {:else}
        <span
          style="cursor: pointer; padding: 0.25rem 0.5rem; border-radius: 0.25rem;"
          on:click={() => startEditField('dueDate', task.dueDate || '')}
          role="button"
          tabindex="0"
          title="Click to edit due date"
        >
          {task.dueDate ? formatDisplayDate(task.dueDate) : '—'}
        </span>
      {/if}
    </Td>
  {/if}

  {#if columnConfig.showCoordinator}
    <Td style="padding: 0.5rem;">
      {#if task.coordinatorInitials}
        <UserAvatar
          initials={task.coordinatorInitials}
          fullName={task.coordinatorName || undefined}
        />
      {:else}
        <span style="color: #a1a1aa;">—</span>
      {/if}
    </Td>
  {/if}

  {#if columnConfig.showAssignedTo}
    <Td style="padding: 0.5rem;">
      {#if task.assignedToInitials}
        <UserAvatar
          initials={task.assignedToInitials}
          fullName={task.assignedToName || undefined}
        />
      {:else}
        <span style="color: #a1a1aa;">—</span>
      {/if}
    </Td>
  {/if}

  {#if columnConfig.showUpdates}
    <Td style="padding: 0.5rem;">
      {#if task.updatesCount > 0}
        <span style="font-size: 0.875rem; color: #71717a;">
          {task.updatesCount} update{task.updatesCount > 1 ? 's' : ''}
        </span>
      {:else}
        <span style="color: #a1a1aa;">—</span>
      {/if}
    </Td>
  {/if}

  {#if columnConfig.showTags}
    <Td style="padding: 0.5rem;">
      {#if task.tags && task.tags.length > 0}
        <div style="display: flex; gap: 0.25rem; flex-wrap: wrap;">
          {#each task.tags.slice(0, 2) as tag}
            <Pill {tag} />
          {/each}
          {#if task.tags.length > 2}
            <Pill label={`+${task.tags.length - 2}`} variant="default" />
          {/if}
        </div>
      {:else}
        <span style="color: #a1a1aa;">—</span>
      {/if}
    </Td>
  {/if}

  {#if columnConfig.showWorkOrder}
    <Td style="padding: 0.5rem;">
      {#if task.workOrderId}
        <a
          href={`/work-orders/${task.workOrderId}`}
          style="color: #3b82f6; text-decoration: underline; cursor: pointer;"
          on:click={(e) => {
            e.stopPropagation()
            alert(`View work order: ${task.workOrderId}`)
          }}
        >
          #{task.workOrderNumber}
        </a>
      {:else}
        <span style="color: #a1a1aa;">—</span>
      {/if}
    </Td>
  {/if}

  {#if columnConfig.showArea}
    <Td style="padding: 0.5rem;">
      {task.areaName || '—'}
    </Td>
  {/if}
</Tr>
