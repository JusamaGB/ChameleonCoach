import type {
  NutritionMealPlanTemplate,
  NutritionMealPlanTemplateDay,
  NutritionRecipe,
} from "@/types"
import { syncCoachNutritionLibrarySheets } from "@/lib/google/sheets"

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

type TemplateDayInput = {
  day: string
  breakfast?: string | null
  lunch?: string | null
  dinner?: string | null
  snacks?: string | null
  notes?: string | null
}

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function cleanNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function normalizeTemplateDays(input: TemplateDayInput[]) {
  const provided = new Map(
    input
      .filter((day) => typeof day.day === "string" && day.day.trim().length > 0)
      .map((day) => [day.day, day])
  )

  return DAYS.map((day) => {
    const row = provided.get(day)
    return {
      day,
      breakfast: cleanText(row?.breakfast),
      lunch: cleanText(row?.lunch),
      dinner: cleanText(row?.dinner),
      snacks: cleanText(row?.snacks),
      notes: cleanText(row?.notes),
    }
  })
}

async function syncCoachNutritionWorkbook(
  supabase: { from: (table: string) => any },
  coachId: string
) {
  try {
    const { data: settings } = await supabase
      .from("admin_settings")
      .select("managed_nutrition_library_sheet_id")
      .eq("user_id", coachId)
      .maybeSingle()

    const sheetId = settings?.managed_nutrition_library_sheet_id
    if (!sheetId) return

    const [recipes, templates] = await Promise.all([
      listNutritionRecipesForCoach(supabase, coachId),
      listNutritionTemplatesForCoach(supabase, coachId),
    ])

    await syncCoachNutritionLibrarySheets(sheetId, coachId, {
      recipes,
      templates,
    })
  } catch (error) {
    console.error("Nutrition coach workbook sync failed", error)
  }
}

export async function listNutritionRecipesForCoach(
  supabase: { from: (table: string) => any },
  coachId: string
) {
  const { data, error } = await supabase
    .from("nutrition_recipes")
    .select("*")
    .eq("coach_id", coachId)
    .eq("is_archived", false)
    .order("name", { ascending: true })

  if (error) throw error
  return (data ?? []) as NutritionRecipe[]
}

export async function createNutritionRecipe(
  supabase: { from: (table: string) => any },
  coachId: string,
  payload: Partial<NutritionRecipe>
) {
  const { data, error } = await supabase
    .from("nutrition_recipes")
    .insert({
      coach_id: coachId,
      name: String(payload.name || "").trim(),
      category: cleanText(payload.category) ?? "general",
      ingredients: cleanText(payload.ingredients),
      notes: cleanText(payload.notes),
      calories_kcal: cleanNumber(payload.calories_kcal),
      protein_grams: cleanNumber(payload.protein_grams),
      carbs_grams: cleanNumber(payload.carbs_grams),
      fats_grams: cleanNumber(payload.fats_grams),
      meal_slot: cleanText(payload.meal_slot) ?? "any",
    })
    .select("*")
    .single()

  if (error) throw error
  await syncCoachNutritionWorkbook(supabase, coachId)
  return data as NutritionRecipe
}

export async function updateNutritionRecipe(
  supabase: { from: (table: string) => any },
  coachId: string,
  recipeId: string,
  payload: Partial<NutritionRecipe>
) {
  const { data, error } = await supabase
    .from("nutrition_recipes")
    .update({
      name: String(payload.name || "").trim(),
      category: cleanText(payload.category) ?? "general",
      ingredients: cleanText(payload.ingredients),
      notes: cleanText(payload.notes),
      calories_kcal: cleanNumber(payload.calories_kcal),
      protein_grams: cleanNumber(payload.protein_grams),
      carbs_grams: cleanNumber(payload.carbs_grams),
      fats_grams: cleanNumber(payload.fats_grams),
      meal_slot: cleanText(payload.meal_slot) ?? "any",
      is_archived: Boolean(payload.is_archived),
      updated_at: new Date().toISOString(),
    })
    .eq("id", recipeId)
    .eq("coach_id", coachId)
    .select("*")
    .single()

  if (error) throw error
  await syncCoachNutritionWorkbook(supabase, coachId)
  return data as NutritionRecipe
}

export async function listNutritionTemplatesForCoach(
  supabase: { from: (table: string) => any },
  coachId: string
) {
  const { data: templates, error } = await supabase
    .from("nutrition_meal_plan_templates")
    .select("*")
    .eq("coach_id", coachId)
    .eq("is_archived", false)
    .order("name", { ascending: true })

  if (error) throw error

  const templateIds = (templates ?? []).map((template: NutritionMealPlanTemplate) => template.id)
  const { data: days, error: daysError } = templateIds.length
    ? await supabase
        .from("nutrition_meal_plan_template_days")
        .select("*")
        .in("template_id", templateIds)
        .order("day", { ascending: true })
    : { data: [], error: null }

  if (daysError) throw daysError

  return ((templates ?? []) as NutritionMealPlanTemplate[]).map((template) => ({
    ...template,
    days: ((days ?? []) as NutritionMealPlanTemplateDay[]).filter((day) => day.template_id === template.id),
  }))
}

export async function createNutritionTemplate(
  supabase: { from: (table: string) => any },
  coachId: string,
  payload: Partial<NutritionMealPlanTemplate> & { days?: TemplateDayInput[] }
) {
  const { data: template, error } = await supabase
    .from("nutrition_meal_plan_templates")
    .insert({
      coach_id: coachId,
      name: String(payload.name || "").trim(),
      description: cleanText(payload.description),
      goal: cleanText(payload.goal),
      target_calories_kcal: cleanNumber(payload.target_calories_kcal),
      target_protein_grams: cleanNumber(payload.target_protein_grams),
      target_carbs_grams: cleanNumber(payload.target_carbs_grams),
      target_fats_grams: cleanNumber(payload.target_fats_grams),
    })
    .select("*")
    .single()

  if (error) throw error

  const days = normalizeTemplateDays(payload.days ?? [])
  const { error: daysInsertError } = await supabase
    .from("nutrition_meal_plan_template_days")
    .insert(
      days.map((day) => ({
        template_id: template.id,
        ...day,
      }))
    )

  if (daysInsertError) throw daysInsertError

  await syncCoachNutritionWorkbook(supabase, coachId)
  return template as NutritionMealPlanTemplate
}

export async function updateNutritionTemplate(
  supabase: { from: (table: string) => any },
  coachId: string,
  templateId: string,
  payload: Partial<NutritionMealPlanTemplate> & { days?: TemplateDayInput[] }
) {
  const { data: template, error } = await supabase
    .from("nutrition_meal_plan_templates")
    .update({
      name: String(payload.name || "").trim(),
      description: cleanText(payload.description),
      goal: cleanText(payload.goal),
      target_calories_kcal: cleanNumber(payload.target_calories_kcal),
      target_protein_grams: cleanNumber(payload.target_protein_grams),
      target_carbs_grams: cleanNumber(payload.target_carbs_grams),
      target_fats_grams: cleanNumber(payload.target_fats_grams),
      is_archived: Boolean(payload.is_archived),
      updated_at: new Date().toISOString(),
    })
    .eq("id", templateId)
    .eq("coach_id", coachId)
    .select("*")
    .single()

  if (error) throw error

  if (payload.days) {
    const { error: deleteError } = await supabase
      .from("nutrition_meal_plan_template_days")
      .delete()
      .eq("template_id", templateId)
    if (deleteError) throw deleteError

    const days = normalizeTemplateDays(payload.days)
    const { error: insertError } = await supabase
      .from("nutrition_meal_plan_template_days")
      .insert(
        days.map((day) => ({
          template_id: templateId,
          ...day,
        }))
      )
    if (insertError) throw insertError
  }

  await syncCoachNutritionWorkbook(supabase, coachId)
  return template as NutritionMealPlanTemplate
}
