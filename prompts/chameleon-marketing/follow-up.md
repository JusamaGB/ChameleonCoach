Draft follow-up copy for an existing lead conversation.

Return JSON with this shape:
{
  "variants": [
    {
      "label": "A",
      "content": "...",
      "rationale": "..."
    }
  ]
}

Requirements:
- Write 2 or 3 variants.
- Use the provided conversation, lead, message, and draft context to determine whether prior outreach actually happened.
- If prior outreach is not evidenced in the context, do not invent it. Instead, return cautious variants that clearly reflect the limited context in the rationale.
- Keep pressure low and clarity high.
- Offer a simple next step.
- Avoid repetitive wording across variants.
