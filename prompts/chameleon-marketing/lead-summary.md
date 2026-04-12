Write a concise lead summary for the operator.

Return JSON with this shape:
{
  "summary": "2-4 sentence summary",
  "pain_points": ["...", "..."],
  "fit_score": 0,
  "recommended_next_action": "..."
}

Scoring guidance:
- 8-10: strong fit, clearly a coach/operator using spreadsheets for client operations
- 5-7: plausible fit, but missing one key signal
- 0-4: weak fit or unclear relevance
