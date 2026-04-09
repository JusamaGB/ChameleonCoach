"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardTitle } from "@/components/ui/card"
import { Input, Select, TextArea } from "@/components/ui/input"
import type { NutritionRecipe } from "@/types"

const CATEGORY_OPTIONS = [
  { value: "general", label: "General" },
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snacks", label: "Snacks" },
  { value: "high_protein", label: "High Protein" },
]

const MEAL_SLOT_OPTIONS = [
  { value: "any", label: "Any slot" },
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snacks", label: "Snacks" },
]

const EMPTY_FORM = {
  name: "",
  category: "general",
  ingredients: "",
  notes: "",
  calories_kcal: "",
  protein_grams: "",
  carbs_grams: "",
  fats_grams: "",
  meal_slot: "any",
}

export function NutritionRecipeManager({ initialRecipes }: { initialRecipes: NutritionRecipe[] }) {
  const [recipes, setRecipes] = useState(initialRecipes)
  const [query, setQuery] = useState("")
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return recipes.filter((recipe) =>
      !normalized
      || [recipe.name, recipe.category, recipe.ingredients ?? "", recipe.notes ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    )
  }, [query, recipes])

  function beginEdit(recipe: NutritionRecipe) {
    setEditingId(recipe.id)
    setForm({
      name: recipe.name,
      category: recipe.category,
      ingredients: recipe.ingredients ?? "",
      notes: recipe.notes ?? "",
      calories_kcal: recipe.calories_kcal?.toString() ?? "",
      protein_grams: recipe.protein_grams?.toString() ?? "",
      carbs_grams: recipe.carbs_grams?.toString() ?? "",
      fats_grams: recipe.fats_grams?.toString() ?? "",
      meal_slot: recipe.meal_slot,
    })
  }

  function resetForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError("")
  }

  async function refreshRecipes() {
    const response = await fetch("/api/admin/recipes")
    const data = await response.json()
    setRecipes(data.recipes ?? [])
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError("")

    const url = editingId ? `/api/admin/recipes/${editingId}` : "/api/admin/recipes"
    const method = editingId ? "PATCH" : "POST"

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Failed to save recipe")
        return
      }
      await refreshRecipes()
      resetForm()
    } catch {
      setError("Failed to save recipe")
    } finally {
      setSaving(false)
    }
  }

  async function archiveRecipe(recipe: NutritionRecipe) {
    if (!confirm(`Archive "${recipe.name}"?`)) return
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/recipes/${recipe.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...recipe,
          is_archived: true,
        }),
      })
      if (response.ok) {
        await refreshRecipes()
        if (editingId === recipe.id) resetForm()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Recipes</h1>
        <p className="mt-2 text-gf-muted">
          Build a coach-owned nutrition library for reusable meals, references, and macro-aware building blocks.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <CardTitle>Recipe Library</CardTitle>
              <p className="mt-1 text-sm text-gf-muted">Search coach-owned meal ideas and nutrition references.</p>
            </div>
            <Badge variant={recipes.length ? "success" : "default"}>{recipes.length} recipes</Badge>
          </div>
          <Input
            label="Search Library"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, category, ingredients, or notes"
          />
          <div className="mt-4 space-y-3">
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gf-border bg-gf-black/10 px-5 py-8">
                <p className="text-sm font-medium text-white">No recipes yet</p>
                <p className="mt-2 text-sm text-gf-muted">Add your first reusable recipe on the right.</p>
              </div>
            ) : (
              filtered.map((recipe) => (
                <div key={recipe.id} className="rounded-xl border border-gf-border bg-gf-black/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-white">{recipe.name}</p>
                        <Badge>{recipe.category}</Badge>
                        <Badge variant="default">{recipe.meal_slot}</Badge>
                      </div>
                      {recipe.ingredients ? <p className="mt-2 text-sm text-gf-muted">{recipe.ingredients}</p> : null}
                      {(recipe.calories_kcal || recipe.protein_grams || recipe.carbs_grams || recipe.fats_grams) ? (
                        <p className="mt-2 text-xs text-gf-muted">
                          {recipe.calories_kcal ? `${recipe.calories_kcal} kcal` : ""}
                          {recipe.protein_grams ? ` • P ${recipe.protein_grams}g` : ""}
                          {recipe.carbs_grams ? ` • C ${recipe.carbs_grams}g` : ""}
                          {recipe.fats_grams ? ` • F ${recipe.fats_grams}g` : ""}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => beginEdit(recipe)}>
                        Edit
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => archiveRecipe(recipe)} disabled={saving}>
                        Archive
                      </Button>
                    </div>
                  </div>
                  {recipe.notes ? <p className="mt-3 text-sm text-gf-muted">{recipe.notes}</p> : null}
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <CardTitle>{editingId ? "Edit Recipe" : "Add Recipe"}</CardTitle>
            {editingId ? <Button type="button" variant="ghost" size="sm" onClick={resetForm}>Cancel</Button> : null}
          </div>
          <form onSubmit={submit} className="space-y-4">
            <Input label="Recipe Name" value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} required />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Category" value={form.category} onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))} options={CATEGORY_OPTIONS} />
              <Select label="Meal Slot" value={form.meal_slot} onChange={(e) => setForm((c) => ({ ...c, meal_slot: e.target.value }))} options={MEAL_SLOT_OPTIONS} />
            </div>
            <TextArea label="Ingredients / Components" value={form.ingredients} onChange={(e) => setForm((c) => ({ ...c, ingredients: e.target.value }))} />
            <TextArea label="Notes" value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Calories (kcal)" type="number" value={form.calories_kcal} onChange={(e) => setForm((c) => ({ ...c, calories_kcal: e.target.value }))} />
              <Input label="Protein (g)" type="number" value={form.protein_grams} onChange={(e) => setForm((c) => ({ ...c, protein_grams: e.target.value }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Carbs (g)" type="number" value={form.carbs_grams} onChange={(e) => setForm((c) => ({ ...c, carbs_grams: e.target.value }))} />
              <Input label="Fats (g)" type="number" value={form.fats_grams} onChange={(e) => setForm((c) => ({ ...c, fats_grams: e.target.value }))} />
            </div>
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : editingId ? "Save Recipe" : "Create Recipe"}</Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
