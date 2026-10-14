import { createClient } from 'npm:@supabase/supabase-js@2'

// Edge Function 공통: service role 클라이언트와 예약 실행 확인. Deno 전용이라 Node 테스트는 이 파일을 부르지 않는다.
export const env = (k: string) => Deno.env.get(k) || undefined

export const admin = () => createClient(env('SUPABASE_URL')!, env('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'house' }, auth: { persistSession: false } })

/** pg_cron 만 부를 수 있게. verify_jwt 를 끈 함수라 이 확인이 문지기다. */
export function fromCron(req: Request) {
  const secret = env('CRON_SECRET')
  return !!secret && req.headers.get('x-cron-secret') === secret
}

export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
