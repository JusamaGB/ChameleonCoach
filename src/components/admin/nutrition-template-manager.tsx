"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardTitle } from "@/components/ui/card"
import { Input, TextArea } from "@/components/ui/input"
import type { NutritionMealPlanTemplate, NutritionMealPlanTemplateDay } from "@/types"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

type TemplateRecord = NutritionMealPlanTemplate & { days: NutritionMealPlanTemplateDay[] }

const EMPTY_FORM = {
  name: "",
  description: "",
  goal: "",
  target_calories_kcal: "",
  target_protein_grams: "",
  target_carbs_grams: "",
  target_fats_grams: "",
  days: DAYS.map((day) => ({ day, breakfast: "", lunch: "", dinner: "", snacks: "", notes: "" })),
}

export function NutritionTemplateManager({ initialTemplates }: { initialTemplates: TemplateRecord[] }) {
  const [templates, setTemplates] = useState(initialTemplates)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function refreshTemplates() {
    const response = await fetch("/api/admin/nutrition-templates")
    const data = await response.json()
    setTemplates(data.templates ?? [])
  }

  function beginEdit(template: TemplateRecord) {
    setEditingId(template.id)
    setForm({
      name: template.name,
      description: template.description ?? "",
      goal: template.goal ?? "",
      target_calories_kcal: template.target_calories_kcal?.toString() ?? "",
      target_protein_grams: template.target_protein_grams?.toString() ?? "",
      target_carbs_grams: template.target_carbs_grams?.toString() ?? "",
      target_fats_grams: template.target_fats_grams?.toString() ?? "",
      days: DAYS.map((day) => {
        const match = template.days.find((entry) => entry.day === day)
        return {
          day,
          breakfast: match?.breakfast ?? "",
          lunch: match?.lunch ?? "",
          dinner: match?.dinner ?? "",
          snacks: match?.snacks ?? "",
          notes: match?.notes ?? "",
        }
      }),
    })
  }

  function resetForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError("")
  }

  function updateDay(dayIndex: number, field: "breakfast" | "lunch" | "dinner" | "snacks" | "notes", value: string) {
    setForm((current) => ({
      ...current,
      days: current.days.map((day, index) => index === dayIndex ? { ...day, [field]: value } : day),
    }))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError("")

    const url = editingId ? `/api/admin/nutrition-templates/${editingId}` : "/api/admin/nutrition-templates"
    const method = editingId ? "PATCH" : "POST"

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Failed to save template")
        return
      }
      await refreshTemplates()
      resetForm()
    } catch {
      setError("Failed to save template")
    } finally {
      setSaving(false)
    }
  }

  async function archiveTemplate(template: TemplateRecord) {
    if (!confirm(`Archive "${template.name}"?`)) return
    setSaving(true)
    try {
      await fetch(`/api/admin/nutrition-templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ...template, is_archived: true, days: template.days }),
      })
      await refreshTemplates()
      if (editingId === template.id) resetForm()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meal Plan Templates</h1>
        <p className="mt-2 text-gf-muted">
          Create reusable nutrition templates coaches can apply consistently before deeper client accountability tools land.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <CardTitle>Template Library</CardTitle>
              <p className="mt-1 text-sm text-gf-muted">Reusable weekly meal structures with optional macro targets.</p>
            </div>
            <Badge variant={templates.length ? "success" : "default"}>{templates.length} templates</Badge>
          </div>
          <div className="space-y-4">
            {templates.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gf-border bg-gf-black/10 px-5 py-8">
                <p className="text-sm font-medium text-white">No templates yet</p>
                <p className="mt-2 text-sm text-gf-muted">Build your first reusable nutrition template on the right.</p>
              </div>
            ) : (
              templates.map((template) => (
                <div key={template.id} className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{template.name}</p>
                      {template.goal ? <p className="mt-1 text-sm text-gf-muted">{template.goal}</p> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => beginEdit(template)}>Edit</Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => archiveTemplate(template)} disabled={saving}>Archive</Button>
                    </div>
                  </div>
                  {template.description ? <p className="mt-2 text-sm text-gf-muted">{template.description}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {template.target_calories_kcal ? <Badge>{template.target_calories_kcal} kcal</Badge> : null}
                    {template.target_protein_grams ? <Badge>P {template.target_protein_grams}g</Badge> : null}
                    {template.target_carbs_grams ? <Badge>C {template.target_carbs_grams}g</Badge> : null}
                    {template.target_fats_grams ? <Badge>F {template.target_fats_grams}g</Badge> : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <CardTitle>{editingId ? "Edit Template" : "Build Template"}</CardTitle>
            {editingId ? <Button type="button" variant="ghost" size="sm" onClick={resetForm}>Cancel</Button> : null}
          </div>
          <form onSubmit={submit} className="space-y-4">
            <Input label="Template Name" value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} required />
            <TextArea label="Description" value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} />
            <Input label="Goal" value={form.goal} onChange={(e) => setForm((c) => ({ ...c, goal: e.target.value }))} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Calories (kcal)" type="number" value={form.target_calories_kcal} onChange={(e) => setForm((c) => ({ ...c, target_calories_kcal: e.target.value }))} />
              <Input label="Protein (g)" type="number" value={form.target_protein_grams} onChange={(e) => setForm((c) => ({ ...c, target_protein_grams: e.target.value }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Carbs (g)" type="number" value={form.target_carbs_grams} onChange={(e) => setForm((c) => ({ ...c, target_carbs_grams: e.target.value }))} />
              <Input label="Fats (g)" type="number" value={form.target_fats_grams} onChange={(e) => setForm((c) => ({ ...c, target_fats_grams: e.target.value }))} />
            </div>
            <div className="space-y-3 border-t border-gf-border pt-4">
              <p className="text-sm font-medium text-white">Weekly structure</p>
              {form.days.map((day, index) => (
                <div key={day.day} className="rounded-xl border border-gf-border bg-gf-black/10 p-3">
                  <p className="mb-3 text-sm font-medium text-white">{day.day}</p>
                  <div className="grid gap-3">
                    <Input label="Breakfast" value={day.breakfast} onChange={(e) => updateDay(index, "breakfast", e.target.value)} />
                    <Input label="Lunch" value={day.lunch} onChange={(e) => updateDay(index, "lunch", e.target.value)} />
                    <Input label="Dinner" value={day.dinner} onChange={(e) => updateDay(index, "dinner", e.target.value)} />
                    <Input label="Snacks" value={day.snacks} onChange={(e) => updateDay(index, "snacks", e.target.value)} />
                    <TextArea label="Notes" value={day.notes} onChange={(e) => updateDay(index, "notes", e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : editingId ? "Save Template" : "Create Template"}</Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
