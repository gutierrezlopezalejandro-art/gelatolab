import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WEBHOOK_SECRET  = Deno.env.get('LEMONSQUEEZY_WEBHOOK_SECRET')!
const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SVC    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

async function verifySignature(body: string, signature: string): Promise<boolean> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign'],
  )
  const buf = await crypto.subtle.sign('HMAC', key, enc.encode(body))
  const hex = Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0')).join('')
  return hex === signature
}

Deno.serve(async (req: Request) => {
  const body      = await req.text()
  const signature = req.headers.get('X-Signature') ?? ''

  if (!(await verifySignature(body, signature))) {
    return new Response('Unauthorized', { status: 401 })
  }

  const event     = JSON.parse(body)
  const eventName: string = event.meta?.event_name ?? ''
  const attrs             = event.data?.attributes  ?? {}
  const email: string     = (attrs.user_email ?? '').toLowerCase()

  const supabase = createClient(SUPABASE_URL, SUPABASE_SVC, {
    auth: { persistSession: false },
  })

  // Buscar usuario por email via admin API
  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const user = users?.find(u => u.email?.toLowerCase() === email)

  if (!user) {
    console.warn(`lemonsqueezy-webhook: no user for email=${email} event=${eventName}`)
    return new Response('OK', { status: 200 })
  }

  // Determinar nuevo plan segun el evento y el status de la suscripcion
  let plan: string       = 'free'
  let expiresAt: string | null = null

  const status = attrs.status ?? ''

  if (['subscription_created', 'subscription_updated', 'subscription_resumed'].includes(eventName)) {
    if (status === 'active' || status === 'on_trial') {
      plan      = 'pro'
      expiresAt = attrs.renews_at ?? attrs.ends_at ?? null
    } else if (status === 'cancelled') {
      // Cancelada pero aun vigente hasta el fin del periodo
      plan      = 'pro'
      expiresAt = attrs.ends_at ?? null
    }
  } else if (eventName === 'subscription_expired') {
    plan      = 'free'
    expiresAt = null
  }
  // subscription_payment_failed: no tocar el plan — se reintenta el cobro

  const { error } = await supabase
    .from('profiles')
    .update({ plan, plan_expires_at: expiresAt })
    .eq('user_id', user.id)

  if (error) {
    console.error('lemonsqueezy-webhook: update error', error.message)
    return new Response('Internal error', { status: 500 })
  }

  console.log(`lemonsqueezy-webhook: ${eventName} → user=${user.id} plan=${plan}`)
  return new Response('OK', { status: 200 })
})
