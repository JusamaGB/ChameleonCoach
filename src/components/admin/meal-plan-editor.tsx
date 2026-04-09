"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { MealPlanDay, NutritionMealPlanTemplate, NutritionMealPlanTemplateDay } from "@/types"

interface MealPlanEditorProps {
  clientId: string
  sheetId: string
  mealPlan: MealPlanDay[]
  templates: Array<NutritionMealPlanTemplate & { days?: NutritionMealPlanTemplateDay[] }>
  onSaved: () => void
  onCancel: () => void
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const MEALS = ["breakfast", "lunch", "dinner", "snacks"] as const

function makeBlankPlan(): MealPlanDay[] {
  return DAYS.map((day) => ({ day, breakfast: "", lunch: "", dinner: "", snacks: "" }))
}

export function MealPlanEditor({
  clientId,
  sheetId,
  mealPlan,
  templates,
  onSaved,
  onCancel,
}: MealPlanEditorProps) {
  const savedPlan = DAYS.map((day) => {
    const existing = mealPlan.find((m) => m.day.toLowerCase() === day.toLowerCase())
    return {
      day,
      breakfast: existing?.breakfast || "",
      lunch: existing?.lunch || "",
      dinner: existing?.dinner || "",
      snacks: existing?.snacks || "",
    }
  })

  const [plan, setPlan] = useState<MealPlanDay[]>(savedPlan)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [columnFill, setColumnFill] = useState<Record<string, string>>({
    breakfast: "", lunch: "", dinner: "", snacks: "",
  })

  function updateCell(dayIndex: number, meal: typeof MEALS[number], value: string) {
    setPlan((prev) => {
      const updated = [...prev]
      updated[dayIndex] = { ...updated[dayIndex], [meal]: value }
      return updated
    })
  }

  function applyTemplate(templateId: string) {
    if (templateId === "") return
    const template = templates.find((entry) => entry.id === templateId)
    if (!template) return

    const dayMap = new Map((template.days ?? []).map((day) => [day.day, day]))
    setPlan(DAYS.map((day) => {
      const match = dayMap.get(day)
      return {
        day,
        breakfast: match?.breakfast ?? "",
        lunch: match?.lunch ?? "",
        dinner: match?.dinner ?? "",
        snacks: match?.snacks ?? "",
      }
    }))
    setSelectedTemplateId(templateId)
  }

  function fillColumn(meal: typeof MEALS[number]) {
    const value = columnFill[meal]
    if (!value.trim()) return
    setPlan((prev) => prev.map((day) => ({ ...day, [meal]: value })))
    setColumnFill((prev) => ({ ...prev, [meal]: "" }))
  }

  async function handleSave() {
    setSaving(true)
    setError("")

    try {
      const res = await fetch(`/api/admin/clients/${clientId}/meal-plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetId, mealPlan: plan }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save meal plan")
      }

      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select
          value={selectedTemplateId}
          onChange={(e) => applyTemplate(e.target.value)}
          className="bg-gf-surface border border-gf-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gf-pink"
        >
          <option value="">Load coach template...</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>{template.name}</option>
          ))}
        </select>

        <button
          onClick={() => {
            setPlan(savedPlan)
            setSelectedTemplateId("")
          }}
          className="text-sm text-gf-muted hover:text-white transition-colors"
        >
          Reset to saved
        </button>
      </div>

      {selectedTemplateId ? (
        <div className="rounded-xl border border-gf-border bg-gf-black/10 px-4 py-3 text-sm text-gf-muted">
          {(() => {
            const selectedTemplate = templates.find((template) => template.id === selectedTemplateId)
            if (!selectedTemplate) return null

            return (
              <>
                <p className="font-medium text-white">{selectedTemplate.name}</p>
                {selectedTemplate.goal ? <p className="mt-1">{selectedTemplate.goal}</p> : null}
                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                  {selectedTemplate.target_calories_kcal ? <span>{selectedTemplate.target_calories_kcal} kcal</span> : null}
                  {selectedTemplate.target_protein_grams ? <span>P {selectedTemplate.target_protein_grams}g</span> : null}
                  {selectedTemplate.target_carbs_grams ? <span>C {selectedTemplate.target_carbs_grams}g</span> : null}
                  {selectedTemplate.target_fats_grams ? <span>F {selectedTemplate.target_fats_grams}g</span> : null}
                </div>
              </>
            )
          })()}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gf-border">
              <th className="text-left py-2 px-2 text-gf-muted font-medium w-24">Day</th>
              {MEALS.map((meal) => (
                <th key={meal} className="text-left py-2 px-2 text-gf-muted font-medium capitalize">
                  <div className="flex flex-col gap-1">
                    <span>{meal}</span>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={columnFill[meal]}
                        onChange={(e) => setColumnFill((prev) => ({ ...prev, [meal]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && fillColumn(meal)}
                        placeholder="Fill all..."
                        className="w-full bg-gf-surface border border-gf-border rounded px-2 py-1 text-xs text-white placeholder:text-gf-muted/50 focus:outline-none focus:border-gf-pink"
                      />
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plan.map((day, i) => (
              <tr key={day.day} className="border-b border-gf-border/50">
                <td className="py-2 px-2 text-white font-medium text-xs">
                  {day.day}
                </td>
                {MEALS.map((meal) => (
                  <td key={meal} className="py-1 px-1">
                    <textarea
                      value={day[meal]}
                      onChange={(e) => updateCell(i, meal, e.target.value)}
                      className="w-full bg-gf-surface border border-gf-border rounded px-2 py-1.5 text-xs text-white placeholder:text-gf-muted/50 focus:outline-none focus:border-gf-pink resize-y min-h-[60px]"
                      placeholder={`${meal}...`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Meal Plan"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
