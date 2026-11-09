import { appUrl, isEmailConfigured, resendFrom, resendKey } from './_env.js'

function link(path, token) {
  const base = appUrl()
  if (!base) throw new Error('APP_URL is not configured')
  return `${base}${path}?token=${encodeURIComponent(token)}`
}

async function sendEmail({ to, subject, html, text }) {
  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Email is not configured')
    }
    console.log(`[email:dev] to=${to} subject=${subject}`)
    return { id: 'dev' }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: resendFrom(), to, subject, html, text }),
  })

  const body = await response.text()
  if (!response.ok) {
    throw new Error(`Resend ${response.status}: ${body}`)
  }
  return body ? JSON.parse(body) : {}
}

export async function sendVerificationEmail(email, token) {
  const url = link('/verify-email', token)
  return sendEmail({
    to: email,
    subject: 'Verify your Bashe Dairy Farm email',
    html: `<p>Confirm your email address for Bashe Dairy Farm.</p>
           <p><a href="${url}">Verify email</a></p>
           <p>This link expires in 24 hours. If you did not request this, ignore this email.</p>`,
    text: `Verify your email (24 hours): ${url}`,
  })
}

export async function sendPasswordResetEmail(email, token) {
  const url = link('/reset-password', token)
  return sendEmail({
    to: email,
    subject: 'Reset your Bashe Dairy Farm password',
    html: `<p>Use the link below to reset your password.</p>
           <p><a href="${url}">Reset password</a></p>
           <p>This link expires in 20 minutes. If you did not request this, ignore this email.</p>`,
    text: `Reset your password (20 minutes): ${url}`,
  })
}

export async function sendPasswordChangedEmail(email) {
  return sendEmail({
    to: email,
    subject: 'Your Bashe Dairy Farm password was changed',
    html: '<p>Your password was changed and all other sessions were signed out.</p>',
    text: 'Your password was changed and all other sessions were signed out.',
  })
}

export async function sendEmailChangedEmail(oldEmail, newEmail) {
  return sendEmail({
    to: oldEmail,
    subject: 'Your Bashe Dairy Farm email was changed',
    html: `<p>Your account email was changed to ${newEmail}.</p>`,
    text: `Your account email was changed to ${newEmail}.`,
  })
}
