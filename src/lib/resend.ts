import { Resend } from "resend"
import { PLATFORM_NAME } from "@/lib/platform"
import { PLATFORM_BRAND_NAME, type CoachBranding } from "@/lib/branding"

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function sendInviteEmail(
  to: string,
  clientName: string,
  inviteCode: string,
  inviteContactType: "email" | "phone",
  branding?: CoachBranding
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const inviteUrl = `${appUrl}/onboarding`
  const brandTitle = branding?.brand_title || PLATFORM_BRAND_NAME
  const brandLogo = branding?.brand_logo_url
  const primaryColor = branding?.brand_primary_color || "#ff2d8a"
  const accentColor = branding?.brand_accent_color || "#ff6bb3"
  const welcomeText =
    branding?.brand_welcome_text ||
    "You've been invited to complete your onboarding and get started."
  const showPoweredBy = branding?.show_powered_by ?? true

  await getResend().emails.send({
    from: `${brandTitle} via ${PLATFORM_NAME} <onboarding@resend.dev>`,
    to,
    subject: `You've been invited to join ${brandTitle}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 40px; border-radius: 12px;">
        <div style="display: flex; align-items: center; gap: 12px; margin: 0 0 24px 0;">
          ${
            brandLogo
              ? `<img src="${brandLogo}" alt="${brandTitle} logo" style="width: 48px; height: 48px; border-radius: 12px; object-fit: cover;" />`
              : `<div style="width: 48px; height: 48px; border-radius: 12px; background: ${primaryColor}; color: #ffffff; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 20px;">${brandTitle.charAt(0).toUpperCase()}</div>`
          }
          <div>
            <h1 style="color: ${primaryColor}; font-size: 24px; margin: 0;">${brandTitle}</h1>
            <p style="font-size: 14px; color: ${accentColor}; margin: 6px 0 0 0;">${welcomeText}</p>
          </div>
        </div>
        <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
          Hi ${clientName},
        </p>
        <p style="font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
          You've been invited to set up your ${brandTitle} profile. Use the invite code below, then confirm with the same ${inviteContactType === "phone" ? "mobile number" : "email address"} your coach used for you.
        </p>
        <div style="display: inline-block; margin: 0 0 24px; padding: 14px 18px; border-radius: 14px; background: #1a1a1a; border: 1px solid #2a2a2a; font-size: 24px; font-weight: 800; letter-spacing: 0.16em;">
          ${inviteCode}
        </div>
        <a href="${inviteUrl}" style="display: inline-block; background: ${primaryColor}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Open Onboarding
        </a>
        <p style="font-size: 13px; color: #888888; margin: 32px 0 0 0;">
          This invite expires in 7 days. If you didn't expect this email, you can ignore it.
        </p>
        ${
          showPoweredBy
            ? `<p style="font-size: 12px; color: #666666; margin: 20px 0 0 0;">Powered by ${PLATFORM_BRAND_NAME}</p>`
            : ""
        }
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

export async function sendAppointmentDeclinedEmail(
  clientEmail: string,
  clientName: string,
  coachNote: string
) {
  await getResend().emails.send({
    from: `${PLATFORM_NAME} <notifications@resend.dev>`,
    to: clientEmail,
    subject: "Your session request",
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 40px; border-radius: 12px;">
        <h1 style="color: #ff2d8a; font-size: 24px; margin: 0 0 24px 0;">${PLATFORM_NAME}</h1>
        <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
          Hi ${clientName}, unfortunately we're unable to confirm your session request at this time.
        </p>
        ${coachNote ? `<p style="font-size: 15px; color: #cccccc; background: #1a1a1a; padding: 16px; border-radius: 8px; margin: 0 0 24px 0;">"${coachNote}"</p>` : ""}
        <p style="font-size: 13px; color: #888888; margin: 24px 0 0 0;">
          Please reach out to your coach directly if you have any questions.
        </p>
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

export async function sendAppointmentPaymentRequestEmail(
  clientEmail: string,
  clientName: string,
  confirmedAt: string,
  amount: number,
  currency: string,
  checkoutUrl: string
) {
  const formattedAmount = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100)

  await getResend().emails.send({
    from: `${PLATFORM_NAME} <notifications@resend.dev>`,
    to: clientEmail,
    subject: "Pay for your confirmed session",
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 40px; border-radius: 12px;">
        <h1 style="color: #ff2d8a; font-size: 24px; margin: 0 0 24px 0;">${PLATFORM_NAME}</h1>
        <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">
          Hi ${clientName}, your session has been confirmed and is ready for payment.
        </p>
        <p style="font-size: 15px; color: #cccccc; margin: 0 0 12px 0;">
          <strong>Date &amp; Time:</strong> ${new Date(confirmedAt).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })}
        </p>
        <p style="font-size: 15px; color: #cccccc; margin: 0 0 24px 0;">
          <strong>Amount due:</strong> ${formattedAmount}
        </p>
        <a href="${checkoutUrl}" style="display: inline-block; background: #ff2d8a; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Pay Now
        </a>
      </div>
    `,
  })
}
