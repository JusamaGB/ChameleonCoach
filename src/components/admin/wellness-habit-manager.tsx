"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardTitle } from "@/components/ui/card"
import { Input, Select, TextArea } from "@/components/ui/input"
import type { WellnessHabitTemplate } from "@/types"

const CATEGORY_OPTIONS = [
  { value: "general", label: "General" },
  { value: "mindset", label: "Mindset" },
  { value: "stress", label: "Stress" },
  { value: "sleep", label: "Sleep" },
  { value: "routine", label: "Routine" },
  { value: "self_care", label: "Self-care" },
]

const PERIOD_OPTIONS = [
  { value: "day", label: "Per day" },
  { value: "week", label: "Per week" },
]

const EMPTY_FORM = {
  name: "",
  description: "",
  category: "general",
  target_count: "1",
  target_period: "day",
  coaching_notes: "",
}

export function WellnessHabitManager({ initialHabits }: { initialHabits: WellnessHabitTemplate[] }) {
  const [habits, setHabits] = useState(initialHabits)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function refreshHabits() {
    const response = await fetch("/api/admin/wellness-habits")
    const data = await response.json()
    setHabits(data.habits ?? [])
  }

  function beginEdit(habit: WellnessHabitTemplate) {
    setEditingId(habit.id)
    setForm({
      name: habit.name,
      description: habit.description ?? "",
      category: habit.category,
      target_count: habit.target_count.toString(),
      target_period: habit.target_period,
      coaching_notes: habit.coaching_notes ?? "",
    })
  }

  function resetForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError("")
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError("")

    const url = editingId ? `/api/admin/wellness-habits/${editingId}` : "/api/admin/wellness-habits"
    const method = editingId ? "PATCH" : "POST"

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Failed to save habit")
        return
      }
      await refreshHabits()
      resetForm()
    } catch {
      setError("Failed to save habit")
    } finally {
      setSaving(false)
    }
  }

  async function archiveHabit(habit: WellnessHabitTemplate) {
    if (!confirm(`Archive "${habit.name}"?`)) return
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/wellness-habits/${habit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...habit, is_archived: true }),
      })
      if (response.ok) {
        await refreshHabits()
        if (editingId === habit.id) resetForm()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Wellness Habits</h1>
        <p className="mt-2 text-gf-muted">
          Build reusable wellness habits coaches can assign for accountability and follow-through.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <CardTitle>Habit Library</CardTitle>
              <p className="mt-1 text-sm text-gf-muted">Coach-owned habits for recurring wellness follow-up.</p>
            </div>
            <Badge variant={habits.length ? "success" : "default"}>{habits.length} habits</Badge>
          </div>
          <div className="space-y-3">
            {habits.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gf-border bg-gf-black/10 px-5 py-8">
                <p className="text-sm font-medium text-white">No habits yet</p>
                <p className="mt-2 text-sm text-gf-muted">Create your first reusable wellness habit on the right.</p>
              </div>
            ) : (
              habits.map((habit) => (
                <div key={habit.id} className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-white">{habit.name}</p>
                        <Badge>{habit.category}</Badge>
                        <Badge variant="default">{habit.target_count} per {habit.target_period}</Badge>
                      </div>
                      {habit.description ? <p className="mt-2 text-sm text-gf-muted">{habit.description}</p> : null}
                      {habit.coaching_notes ? <p className="mt-2 text-sm text-gf-muted">{habit.coaching_notes}</p> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => beginEdit(habit)}>Edit</Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => archiveHabit(habit)} disabled={saving}>Archive</Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <CardTitle>{editingId ? "Edit Habit" : "Add Habit"}</CardTitle>
            {editingId ? <Button type="button" variant="ghost" size="sm" onClick={resetForm}>Cancel</Button> : null}
          </div>
          <form onSubmit={submit} className="space-y-4">
            <Input label="Habit Name" value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} required />
            <TextArea label="Description" value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Category" value={form.category} onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))} options={CATEGORY_OPTIONS} />
              <Select label="Target Period" value={form.target_period} onChange={(e) => setForm((c) => ({ ...c, target_period: e.target.value }))} options={PERIOD_OPTIONS} />
            </div>
            <Input label="Target Count" type="number" min="1" value={form.target_count} onChange={(e) => setForm((c) => ({ ...c, target_count: e.target.value }))} />
            <TextArea label="Coaching Notes" value={form.coaching_notes} onChange={(e) => setForm((c) => ({ ...c, coaching_notes: e.target.value }))} />
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : editingId ? "Save Habit" : "Create Habit"}</Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
