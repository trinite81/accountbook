import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:5173'

interface InvitePayload {
  toEmail: string
  fromEmail: string
  invitationId: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { toEmail, fromEmail, invitationId } = await req.json() as InvitePayload

    if (!toEmail || !fromEmail || !invitationId) {
      return new Response(JSON.stringify({ error: 'missing fields' }), { status: 400 })
    }

    const acceptUrl = `${APP_URL}/auth?invite=${invitationId}`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@resend.dev',
        to: toEmail,
        subject: `${fromEmail}님이 가계부 공유를 요청했어요`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="font-size:20px;margin-bottom:8px">가계부 공유 초대</h2>
            <p style="color:#555;margin-bottom:24px">
              <strong>${fromEmail}</strong>님이 복식부기 가계부를 함께 사용하자고 초대했어요.
            </p>
            <a href="${acceptUrl}"
               style="display:inline-block;padding:12px 24px;background:#0f172a;color:#fff;
                      border-radius:8px;text-decoration:none;font-weight:600">
              초대 확인하기
            </a>
            <p style="color:#999;font-size:12px;margin-top:24px">
              이 이메일을 요청하지 않았다면 무시하셔도 됩니다.
            </p>
          </div>
        `,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return new Response(JSON.stringify({ error: err }), { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
