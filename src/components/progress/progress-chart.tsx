"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import { Card, CardTitle } from "@/components/ui/card"
import type { ProgressEntry } from "@/types"

interface Props {
  entries: ProgressEntry[]
}

export function ProgressChart({ entries }: Props) {
  const chartData = entries
    .filter((e) => e.weight)
    .map((e) => ({
      date: e.date,
      weight: parseFloat(e.weight),
    }))
    .filter((d) => !isNaN(d.weight))

  if (chartData.length < 2) {
    return (
      <Card>
        <CardTitle>Weight Trend</CardTitle>
        <p className="text-sm text-gf-muted mt-4">
          Log at least 2 weigh-ins to see your trend
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <CardTitle>Weight Trend</CardTitle>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis
              dataKey="date"
              stroke="#888"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="#888"
              fontSize={12}
              tickLine={false}
              domain={["dataMin - 2", "dataMax + 2"]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #2a2a2a",
                borderRadius: "8px",
                color: "#fff",
              }}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#ff2d8a"
              strokeWidth={2}
              dot={{ fill: "#ff2d8a", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export function ProgressHistory({ entries }: Props) {
  if (entries.length === 0) {
    return null
  }

  const reversed = [...entries].reverse()

  return (
    <Card>
      <CardTitle>History</CardTitle>
      <div className="mt-4 space-y-3">
        {reversed.map((entry, i) => (
          <div
            key={i}
            className="flex items-start justify-between py-3 border-b border-gf-border last:border-0"
          >
            <div>
              <p className="text-sm font-medium text-white">{entry.date}</p>
              {entry.measurements && (
                <p className="text-xs text-gf-muted mt-0.5">
                  {entry.measurements}
                </p>
              )}
              {entry.notes && (
                <p className="text-xs text-gf-muted/70 mt-0.5 italic">
                  {entry.notes}
                </p>
              )}
            </div>
            {entry.weight && (
              <span className="text-sm font-semibold text-gf-pink">
                {entry.weight}
              </span>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
