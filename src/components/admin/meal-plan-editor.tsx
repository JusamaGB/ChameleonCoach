"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { MealPlanDay } from "@/types"

interface MealPlanEditorProps {
  clientId: string
  sheetId: string
  mealPlan: MealPlanDay[]
  onSaved: () => void
  onCancel: () => void
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const MEALS = ["breakfast", "lunch", "dinner", "snacks"] as const

const TEMPLATES: Record<string, Partial<MealPlanDay>> = {
  "High Protein": {
    breakfast: "Eggs, Greek yogurt, berries",
    lunch: "Grilled chicken, rice, veg",
    dinner: "Salmon, sweet potato, greens",
    snacks: "Protein shake, mixed nuts",
  },
  "Vegetarian": {
    breakfast: "Oats with seeds and fruit",
    lunch: "Lentil soup, wholegrain bread",
    dinner: "Tofu stir fry with noodles",
    snacks: "Hummus, carrot sticks, fruit",
  },
  "Calorie Deficit": {
    breakfast: "Egg whites, spinach, coffee",
    lunch: "Large salad, tuna, lemon dressing",
    dinner: "Lean mince, courgette noodles",
    snacks: "Rice cakes, celery, cucumber",
  },
}

function makeBlankPlan(): MealPlanDay[] {
  return DAYS.map((day) => ({ day, breakfast: "", lunch: "", dinner: "", snacks: "" }))
}

export function MealPlanEditor({
  clientId,
  sheetId,
  mealPlan,
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

  function applyTemplate(templateName: string) {
    if (templateName === "") return
    const tpl = TEMPLATES[templateName]
    if (!tpl) return
    setPlan(DAYS.map((day) => ({
      day,
      breakfast: tpl.breakfast ?? "",
      lunch: tpl.lunch ?? "",
      dinner: tpl.dinner ?? "",
      snacks: tpl.snacks ?? "",
    })))
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
          onChange={(e) => { applyTemplate(e.target.value); e.target.value = "" }}
          defaultValue=""
          className="bg-gf-surface border border-gf-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gf-pink"
        >
          <option value="" disabled>Load template...</option>
          {Object.keys(TEMPLATES).map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        <button
          onClick={() => setPlan(savedPlan)}
          className="text-sm text-gf-muted hover:text-white transition-colors"
        >
          Reset to saved
        </button>
      </div>

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
