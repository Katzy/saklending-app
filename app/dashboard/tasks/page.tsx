'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'

type Task = {
  id: string
  title: string
  notes: string | null
  due_date: string | null
  loan_id: string | null
  completed: boolean
  completed_at: string | null
  created_at: string
  loans?: { address_street: string | null; address_city: string | null; address_state: string | null } | null
}

function today() {
  return new Date().toISOString().split('T')[0]
}
function isPast(d: string) { return d < today() }
function isToday(d: string) { return d === today() }

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function daysAgo(d: string) {
  const n = Math.floor((Date.now() - new Date(d + 'T00:00:00').getTime()) / 86400000)
  return n === 1 ? '1 day overdue' : `${n} days overdue`
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showCompleted, setShowCompleted] = useState(false)

  // Add form
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [adding, setAdding] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  async function fetchTasks() {
    const res = await fetch('/api/tasks')
    if (res.ok) setTasks(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchTasks() }, [])

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setAdding(true)
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, notes: notes || null, due_date: dueDate || null }),
    })
    setTitle(''); setNotes(''); setDueDate('')
    await fetchTasks()
    setAdding(false)
    titleRef.current?.focus()
  }

  async function toggle(task: Task) {
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !task.completed }),
    })
    await fetchTasks()
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    await fetchTasks()
  }

  const open = tasks.filter(t => !t.completed)
  const completed = tasks.filter(t => t.completed)

  const overdue   = open.filter(t => t.due_date && isPast(t.due_date))
  const dueToday  = open.filter(t => t.due_date && isToday(t.due_date))
  const upcoming  = open.filter(t => t.due_date && !isPast(t.due_date) && !isToday(t.due_date))
  const undated   = open.filter(t => !t.due_date)

  const totalDue = overdue.length + dueToday.length

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          {totalDue > 0 && (
            <p className="text-sm text-amber-600 mt-0.5 font-medium">{totalDue} item{totalDue !== 1 ? 's' : ''} due today or overdue</p>
          )}
        </div>
      </div>

      {/* Add task form */}
      <form onSubmit={addTask} className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex gap-2 mb-2">
          <input
            ref={titleRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="New task..."
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
          />
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003087]"
          />
          <button
            type="submit"
            disabled={adding || !title.trim()}
            className="bg-[#003087] text-white px-4 py-2 rounded text-sm font-medium hover:bg-[#002070] disabled:opacity-50"
          >
            Add
          </button>
        </div>
        <input
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#003087]"
        />
        <p className="text-xs text-gray-400 mt-1.5">
          No date = included in every daily reminder email. Set a date to be reminded on that day.
        </p>
      </form>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : (
        <div className="space-y-5">
          <TaskGroup title="Overdue" color="text-red-600" tasks={overdue} onToggle={toggle} onDelete={deleteTask} dateLabel={t => t.due_date ? daysAgo(t.due_date) : ''} dateColor="text-red-500" />
          <TaskGroup title="Due Today" color="text-amber-600" tasks={dueToday} onToggle={toggle} onDelete={deleteTask} dateLabel={() => 'Today'} dateColor="text-amber-500" />
          <TaskGroup title="Upcoming" color="text-blue-600" tasks={upcoming} onToggle={toggle} onDelete={deleteTask} dateLabel={t => t.due_date ? fmtDate(t.due_date) : ''} dateColor="text-gray-400" />
          <TaskGroup title="No Date" color="text-gray-500" tasks={undated} onToggle={toggle} onDelete={deleteTask} dateLabel={() => 'Daily reminder'} dateColor="text-gray-400" />

          {completed.length > 0 && (
            <div>
              <button
                onClick={() => setShowCompleted(v => !v)}
                className="text-xs text-gray-400 hover:text-gray-600 font-medium mb-2"
              >
                {showCompleted ? '▼' : '▶'} Completed ({completed.length})
              </button>
              {showCompleted && (
                <TaskGroup title="" color="" tasks={completed} onToggle={toggle} onDelete={deleteTask} dateLabel={t => t.completed_at ? fmtDate(t.completed_at.split('T')[0]) : ''} dateColor="text-gray-300" dim />
              )}
            </div>
          )}

          {open.length === 0 && (
            <p className="text-sm text-gray-400 italic text-center py-8">No open tasks. Add one above.</p>
          )}
        </div>
      )}
    </div>
  )
}

function TaskGroup({
  title, color, tasks, onToggle, onDelete, dateLabel, dateColor, dim
}: {
  title: string; color: string; tasks: Task[]
  onToggle: (t: Task) => void; onDelete: (id: string) => void
  dateLabel: (t: Task) => string; dateColor: string; dim?: boolean
}) {
  if (tasks.length === 0) return null
  return (
    <div>
      {title && <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${color}`}>{title} ({tasks.length})</p>}
      <div className="space-y-2">
        {tasks.map(task => (
          <TaskRow key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} dateLabel={dateLabel(task)} dateColor={dateColor} dim={dim} />
        ))}
      </div>
    </div>
  )
}

function TaskRow({ task, onToggle, onDelete, dateLabel, dateColor, dim }: {
  task: Task; onToggle: (t: Task) => void; onDelete: (id: string) => void
  dateLabel: string; dateColor: string; dim?: boolean
}) {
  const loan = task.loans
  const loanLabel = loan ? [loan.address_street, loan.address_city, loan.address_state].filter(Boolean).join(', ') : null

  return (
    <div className={`flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 group ${dim ? 'opacity-50' : ''}`}>
      <button
        onClick={() => onToggle(task)}
        className={`mt-0.5 w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition ${
          task.completed ? 'bg-[#003087] border-[#003087]' : 'border-gray-300 hover:border-[#003087]'
        }`}
      >
        {task.completed && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${task.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.title}</p>
        {task.notes && <p className="text-xs text-gray-500 mt-0.5">{task.notes}</p>}
        {loanLabel && (
          <Link href={`/dashboard/loans/${task.loan_id}`} className="text-xs text-[#003087] hover:underline mt-0.5 block">
            📍 {loanLabel}
          </Link>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {dateLabel && <span className={`text-xs ${dateColor}`}>{dateLabel}</span>}
        <button
          onClick={() => onDelete(task.id)}
          className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition text-xs"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
