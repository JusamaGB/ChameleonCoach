import { Resend } from "resend"
import { PLATFORM_NAME } from "@/lib/platform"

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function sendInviteEmail(
  to: string,
  clientName: string,
  inviteToken: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const inviteUrl = `${appUrl}/onboarding?token=${inviteToken}`

  await getResend().emails.send({
    from: `${PLATFORM_NAME} <onboarding@resend.dev>`,
    to,
    subject: `You've been invited to join ${PLATFORM_NAME}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 40px; border-radius: 12px;">
        <h1 style="color: #ff2d8a; font-size: 24px; margin: 0 0 24px 0;">${PLATFORM_NAME}</h1>
        <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
          Hi ${clientName},
        </p>
        <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
          You've been invited to set up your ${PLATFORM_NAME} profile. Click the button below to get started with your onboarding questionnaire.
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

export async function sendAppointmentRequestEmail(
  coachEmail: string,
  clientName: string,
  note: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  await getResend().emails.send({
    from: `${PLATFORM_NAME} <notifications@resend.dev>`,
    to: coachEmail,
    subject: `New session request from ${clientName}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 40px; border-radius: 12px;">
        <h1 style="color: #ff2d8a; font-size: 24px; margin: 0 0 24px 0;">${PLATFORM_NAME}</h1>
        <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
          <strong>${clientName}</strong> has requested a session.
        </p>
        ${note ? `<p style="font-size: 15px; color: #cccccc; background: #1a1a1a; padding: 16px; border-radius: 8px; margin: 0 0 24px 0;">"${note}"</p>` : ""}
        <a href="${appUrl}/admin/appointments" style="display: inline-block; background: #ff2d8a; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          View Appointments
        </a>
      </div>
    `,
  })
}

export async function sendAppointmentConfirmedEmail(
  clientEmail: string,
  clientName: string,
  confirmedAt: string,
  coachNote: string
) {
  await getResend().emails.send({
    from: `${PLATFORM_NAME} <notifications@resend.dev>`,
    to: clientEmail,
    subject: "Your session has been confirmed",
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 40px; border-radius: 12px;">
        <h1 style="color: #ff2d8a; font-size: 24px; margin: 0 0 24px 0;">${PLATFORM_NAME}</h1>
        <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
          Hi ${clientName}, your session has been confirmed!
        </p>
        <p style="font-size: 15px; color: #cccccc; margin: 0 0 16px 0;">
          <strong>Date &amp; Time:</strong> ${new Date(confirmedAt).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })}
        </p>
        ${coachNote ? `<p style="font-size: 15px; color: #cccccc; background: #1a1a1a; padding: 16px; border-radius: 8px; margin: 0 0 24px 0;">Note from your coach: "${coachNote}"</p>` : ""}
      </div>
    `,
  })
}
