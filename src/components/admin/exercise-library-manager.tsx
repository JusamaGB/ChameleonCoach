"use client"

import { useMemo, useState } from "react"
import { Card, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input, Select, TextArea } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Pencil } from "lucide-react"
import type { Exercise } from "@/types"

const CATEGORY_OPTIONS = [
  { value: "strength", label: "Strength" },
  { value: "conditioning", label: "Conditioning" },
  { value: "mobility", label: "Mobility" },
  { value: "warm_up", label: "Warm-up" },
  { value: "cool_down", label: "Cool-down" },
  { value: "core", label: "Core" },
  { value: "other", label: "Other" },
]

const EMPTY_FORM = {
  name: "",
  category: "",
  description: "",
  coaching_notes: "",
  media_url: "",
}

type ExerciseFormState = typeof EMPTY_FORM

function formatCategory(category: string) {
  return CATEGORY_OPTIONS.find((option) => option.value === category)?.label
    ?? category.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

function toFormState(exercise: Exercise): ExerciseFormState {
  return {
    name: exercise.name,
    category: exercise.category,
    description: exercise.description ?? "",
    coaching_notes: exercise.coaching_notes ?? "",
    media_url: exercise.media_url ?? "",
  }
}

function ExerciseForm({
  title,
  submitLabel,
  form,
  saving,
  error,
  onChange,
  onSubmit,
  onCancel,
}: {
  title: string
  submitLabel: string
  form: ExerciseFormState
  saving: boolean
  error: string
  onChange: (field: keyof ExerciseFormState, value: string) => void
  onSubmit: (event: React.FormEvent) => void
  onCancel?: () => void
}) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {onCancel ? (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Exercise Name"
          value={form.name}
          onChange={(event) => onChange("name", event.target.value)}
          placeholder="e.g. Romanian Deadlift"
          required
        />
        <Select
          label="Category"
          value={form.category}
          onChange={(event) => onChange("category", event.target.value)}
          options={CATEGORY_OPTIONS}
          required
        />
        <TextArea
          label="Description"
          value={form.description}
          onChange={(event) => onChange("description", event.target.value)}
          placeholder="Short movement description for future builder and coaching context."
        />
        <TextArea
          label="Coaching Notes"
          value={form.coaching_notes}
          onChange={(event) => onChange("coaching_notes", event.target.value)}
          placeholder="Cueing, setup reminders, or common mistakes."
        />
        <Input
          label="Media URL"
          value={form.media_url}
          onChange={(event) => onChange("media_url", event.target.value)}
          placeholder="Optional link placeholder for demo media"
          type="url"
        />
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : submitLabel}
        </Button>
      </form>
    </Card>
  )
}

export function ExerciseLibraryManager({
  initialExercises,
}: {
  initialExercises: Exercise[]
}) {
  const [exercises, setExercises] = useState(initialExercises)
  const [query, setQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [createForm, setCreateForm] = useState<ExerciseFormState>(EMPTY_FORM)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<ExerciseFormState>(EMPTY_FORM)
  const [createSaving, setCreateSaving] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [createError, setCreateError] = useState("")
  const [editError, setEditError] = useState("")

  const filteredExercises = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return exercises.filter((exercise) => {
      const matchesCategory =
        categoryFilter === "all" || exercise.category === categoryFilter
      const haystack = [
        exercise.name,
        exercise.category,
        exercise.description ?? "",
        exercise.coaching_notes ?? "",
      ]
        .join(" ")
        .toLowerCase()

      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery)
      return matchesCategory && matchesQuery
    })
  }, [categoryFilter, exercises, query])

  function updateCreate(field: keyof ExerciseFormState, value: string) {
    setCreateForm((current) => ({ ...current, [field]: value }))
  }

  function updateEdit(field: keyof ExerciseFormState, value: string) {
    setEditForm((current) => ({ ...current, [field]: value }))
  }

  async function createExercise(event: React.FormEvent) {
    event.preventDefault()
    setCreateSaving(true)
    setCreateError("")

    try {
      const response = await fetch("/api/admin/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      })

      const data = await response.json()
      if (!response.ok) {
        setCreateError(data.error || "Failed to create exercise")
        return
      }

      setExercises((current) =>
        [...current, data.exercise as Exercise].sort((a, b) => a.name.localeCompare(b.name))
      )
      setCreateForm(EMPTY_FORM)
    } catch {
      setCreateError("Failed to create exercise")
    } finally {
      setCreateSaving(false)
    }
  }

  async function saveExercise(event: React.FormEvent) {
    event.preventDefault()
    if (!editId) return

    setEditSaving(true)
    setEditError("")

    try {
      const response = await fetch(`/api/admin/exercises/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })

      const data = await response.json()
      if (!response.ok) {
        setEditError(data.error || "Failed to update exercise")
        return
      }

      setExercises((current) =>
        current
          .map((exercise) => (exercise.id === editId ? data.exercise as Exercise : exercise))
          .sort((a, b) => a.name.localeCompare(b.name))
      )
      setEditId(null)
      setEditForm(EMPTY_FORM)
    } catch {
      setEditError("Failed to update exercise")
    } finally {
      setEditSaving(false)
    }
  }

  function startEdit(exercise: Exercise) {
    setEditId(exercise.id)
    setEditForm(toFormState(exercise))
    setEditError("")
  }

  function cancelEdit() {
    setEditId(null)
    setEditForm(EMPTY_FORM)
    setEditError("")
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Exercises</h1>
        <p className="text-gf-muted">
          Build your PT exercise library here, then use these movements inside workouts and programs.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <CardTitle>Library</CardTitle>
              <p className="mt-1 text-sm text-gf-muted">
                Search by name, category, description, or coaching notes.
              </p>
            </div>
            <Badge variant={exercises.length > 0 ? "success" : "default"}>
              {exercises.length} exercise{exercises.length === 1 ? "" : "s"}
            </Badge>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gf-muted"
              />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search exercises..."
                className="w-full rounded-lg border border-gf-border bg-gf-surface py-2 pl-9 pr-4 text-sm text-white placeholder:text-gf-muted/50 focus:border-gf-pink focus:outline-none focus:ring-1 focus:ring-gf-pink/30"
              />
            </div>
            <Select
              label="Category Filter"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              options={[
                { value: "all", label: "All categories" },
                ...CATEGORY_OPTIONS,
              ]}
            />
          </div>

          {filteredExercises.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gf-border bg-gf-black/10 px-5 py-8">
              <p className="text-sm font-medium text-white">
                {exercises.length === 0 ? "No exercises yet" : "No matching exercises"}
              </p>
              <p className="mt-2 text-sm text-gf-muted">
                {exercises.length === 0
                  ? "Create your first exercise on the right to start building the PT library."
                  : "Try a different search term or clear the category filter."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredExercises.map((exercise) => {
                const isEditing = editId === exercise.id

                return (
                  <div
                    key={exercise.id}
                    className="rounded-xl border border-gf-border bg-gf-black/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white">{exercise.name}</p>
                          <Badge>{formatCategory(exercise.category)}</Badge>
                        </div>
                        {exercise.description ? (
                          <p className="mt-2 text-sm text-gf-muted">{exercise.description}</p>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(exercise)}
                      >
                        <Pencil size={14} className="mr-1.5" />
                        Edit
                      </Button>
                    </div>

                    {exercise.coaching_notes ? (
                      <div className="mt-3">
                        <p className="text-xs uppercase tracking-wide text-gf-muted">Coaching Notes</p>
                        <p className="mt-1 text-sm text-white">{exercise.coaching_notes}</p>
                      </div>
                    ) : null}

                    {exercise.media_url ? (
                      <div className="mt-3">
                        <p className="text-xs uppercase tracking-wide text-gf-muted">Media URL</p>
                        <a
                          href={exercise.media_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block break-all text-sm text-gf-pink hover:text-gf-pink-light"
                        >
                          {exercise.media_url}
                        </a>
                      </div>
                    ) : null}

                    {isEditing ? (
                      <div className="mt-4 border-t border-gf-border pt-4">
                        <ExerciseForm
                          title="Edit Exercise"
                          submitLabel="Save Changes"
                          form={editForm}
                          saving={editSaving}
                          error={editError}
                          onChange={updateEdit}
                          onSubmit={saveExercise}
                          onCancel={cancelEdit}
                        />
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <ExerciseForm
          title="Add Exercise"
          submitLabel="Create Exercise"
          form={createForm}
          saving={createSaving}
          error={createError}
          onChange={updateCreate}
          onSubmit={createExercise}
        />
      </div>
    </div>
  )
}
