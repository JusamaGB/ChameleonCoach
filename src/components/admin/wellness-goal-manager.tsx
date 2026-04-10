"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardTitle } from "@/components/ui/card"
import { Input, Select, TextArea } from "@/components/ui/input"
import type { WellnessGoalTemplate } from "@/types"

const CATEGORY_OPTIONS = [
  { value: "general", label: "General" },
  { value: "mindset", label: "Mindset" },
  { value: "stress", label: "Stress" },
  { value: "sleep", label: "Sleep" },
  { value: "routine", label: "Routine" },
  { value: "self_care", label: "Self-care" },
]

const EMPTY_FORM = {
  name: "",
  category: "general",
  description: "",
  target_metric: "",
  target_value: "",
  milestone_label: "",
  coaching_notes: "",
}

export function WellnessGoalManager({ initialGoals }: { initialGoals: WellnessGoalTemplate[] }) {
  const [goals, setGoals] = useState(initialGoals)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function refreshGoals() {
    const response = await fetch("/api/admin/wellness-goals")
    const data = await response.json()
    setGoals(data.goals ?? [])
  }

  function beginEdit(goal: WellnessGoalTemplate) {
    setEditingId(goal.id)
    setForm({
      name: goal.name,
      category: goal.category,
      description: goal.description ?? "",
      target_metric: goal.target_metric ?? "",
      target_value: goal.target_value ?? "",
      milestone_label: goal.milestone_label ?? "",
      coaching_notes: goal.coaching_notes ?? "",
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

    const url = editingId ? `/api/admin/wellness-goals/${editingId}` : "/api/admin/wellness-goals"
    const method = editingId ? "PATCH" : "POST"

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Failed to save goal")
        return
      }
      await refreshGoals()
      resetForm()
    } catch {
      setError("Failed to save goal")
    } finally {
      setSaving(false)
    }
  }

  async function archiveGoal(goal: WellnessGoalTemplate) {
    if (!confirm(`Archive "${goal.name}"?`)) return
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/wellness-goals/${goal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...goal, is_archived: true }),
      })
      if (response.ok) {
        await refreshGoals()
        if (editingId === goal.id) resetForm()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Wellness Goals</h1>
        <p className="mt-2 text-gf-muted">
          Build reusable goal templates for coaching outcomes, milestones, and follow-up.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <CardTitle>Goal Library</CardTitle>
              <p className="mt-1 text-sm text-gf-muted">Coach-owned wellness goals ready to assign in client workspaces.</p>
            </div>
            <Badge variant={goals.length ? "success" : "default"}>{goals.length} goals</Badge>
          </div>
          <div className="space-y-3">
            {goals.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gf-border bg-gf-black/10 px-5 py-8">
                <p className="text-sm font-medium text-white">No goals yet</p>
                <p className="mt-2 text-sm text-gf-muted">Create your first reusable wellness goal on the right.</p>
              </div>
            ) : (
              goals.map((goal) => (
                <div key={goal.id} className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-white">{goal.name}</p>
                        <Badge>{goal.category}</Badge>
                        {goal.target_metric ? <Badge variant="default">{goal.target_metric}</Badge> : null}
                        {goal.target_value ? <Badge variant="default">{goal.target_value}</Badge> : null}
                      </div>
                      {goal.description ? <p className="mt-2 text-sm text-gf-muted">{goal.description}</p> : null}
                      {goal.milestone_label ? <p className="mt-2 text-sm text-gf-muted">Milestone: {goal.milestone_label}</p> : null}
                      {goal.coaching_notes ? <p className="mt-2 text-sm text-gf-muted">{goal.coaching_notes}</p> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => beginEdit(goal)}>Edit</Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => archiveGoal(goal)} disabled={saving}>Archive</Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <CardTitle>{editingId ? "Edit Goal" : "Add Goal"}</CardTitle>
            {editingId ? <Button type="button" variant="ghost" size="sm" onClick={resetForm}>Cancel</Button> : null}
          </div>
          <form onSubmit={submit} className="space-y-4">
            <Input label="Goal Name" value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} required />
            <Select label="Category" value={form.category} onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))} options={CATEGORY_OPTIONS} />
            <TextArea label="Description" value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Target metric" value={form.target_metric} onChange={(e) => setForm((c) => ({ ...c, target_metric: e.target.value }))} placeholder="e.g. Bedtime consistency" />
              <Input label="Target value" value={form.target_value} onChange={(e) => setForm((c) => ({ ...c, target_value: e.target.value }))} placeholder="e.g. 5 nights per week" />
            </div>
            <Input label="Milestone label" value={form.milestone_label} onChange={(e) => setForm((c) => ({ ...c, milestone_label: e.target.value }))} placeholder="e.g. Two calm evenings in a row" />
            <TextArea label="Coaching Notes" value={form.coaching_notes} onChange={(e) => setForm((c) => ({ ...c, coaching_notes: e.target.value }))} />
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : editingId ? "Save Goal" : "Create Goal"}</Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
