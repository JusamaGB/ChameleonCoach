"use client"

import { Card } from "@/components/ui/card"
import type { MealPlanDay } from "@/types"
import { UtensilsCrossed } from "lucide-react"

interface Props {
  mealPlan: MealPlanDay[]
  highlightToday?: boolean
}

const dayNames = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]

function getTodayName(): string {
  return dayNames[((new Date().getDay() + 6) % 7)]
}

export function MealPlanView({ mealPlan, highlightToday = false }: Props) {
  const today = getTodayName()

  if (mealPlan.length === 0) {
    return (
      <Card className="text-center py-12">
        <UtensilsCrossed size={40} className="mx-auto text-gf-muted mb-4" />
        <p className="text-gf-muted">No meal plan yet</p>
        <p className="text-sm text-gf-muted/60 mt-1">
          Your coach will add your plan soon
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {mealPlan.map((day) => {
        const isToday = highlightToday && day.day === today
        const isEmpty = !day.breakfast && !day.lunch && !day.dinner && !day.snacks

        return (
          <Card
            key={day.day}
            glow={isToday}
            className={isEmpty ? "opacity-50" : ""}
          >
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-semibold text-white">{day.day}</h3>
              {isToday && (
                <span className="text-xs bg-gf-pink/20 text-gf-pink px-2 py-0.5 rounded-full">
                  Today
                </span>
              )}
            </div>

            {isEmpty ? (
              <p className="text-sm text-gf-muted">Not yet planned</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MealSlot label="Breakfast" content={day.breakfast} />
                <MealSlot label="Lunch" content={day.lunch} />
                <MealSlot label="Dinner" content={day.dinner} />
                <MealSlot label="Snacks" content={day.snacks} />
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

function MealSlot({ label, content }: { label: string; content: string }) {
  if (!content) return null

  return (
    <div>
      <p className="text-xs text-gf-pink font-medium mb-1">{label}</p>
      <p className="text-sm text-white/90">{content}</p>
    </div>
  )
}

export function TodaysMeals({ mealPlan }: { mealPlan: MealPlanDay[] }) {
  const today = getTodayName()
  const todayPlan = mealPlan.find((d) => d.day === today)

  if (!todayPlan || (!todayPlan.breakfast && !todayPlan.lunch && !todayPlan.dinner)) {
    return (
      <Card>
        <h3 className="font-semibold mb-2">Today&apos;s Meals</h3>
        <p className="text-sm text-gf-muted">No meals planned for today</p>
      </Card>
    )
  }

  return (
    <Card glow>
      <h3 className="font-semibold mb-4">Today&apos;s Meals</h3>
      <div className="space-y-3">
        <MealSlot label="Breakfast" content={todayPlan.breakfast} />
        <MealSlot label="Lunch" content={todayPlan.lunch} />
        <MealSlot label="Dinner" content={todayPlan.dinner} />
        <MealSlot label="Snacks" content={todayPlan.snacks} />
      </div>
    </Card>
  )
}
