import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendInviteEmail(
  to: string,
  clientName: string,
  inviteToken: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const inviteUrl = `${appUrl}/onboarding?token=${inviteToken}`

  await resend.emails.send({
    from: "G-Fitness <onboarding@resend.dev>",
    to,
    subject: "You've been invited to join G-Fitness",
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 40px; border-radius: 12px;">
        <h1 style="color: #ff2d8a; font-size: 24px; margin: 0 0 24px 0;">G-Fitness</h1>
        <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
          Hi ${clientName},
        </p>
        <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
          You've been invited to set up your G-Fitness profile. Click the button below to get started with your onboarding questionnaire.
        </p>
        <a href="${inviteUrl}" style="display: inline-block; background: #ff2d8a; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Get Started
        </a>
        <p style="font-size: 13px; color: #888888; margin: 32px 0 0 0;">
          This link expires in 7 days. If you didn't expect this email, you can ignore it.
        </p>
      </div>
    `,
  })
}
