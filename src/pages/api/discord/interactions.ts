import type { APIRoute } from "astro";
import { isValidRequest, PlatformAlgorithm } from "discord-verify";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import supabase from "@/db";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export const prerender = false;

// Constants
const INTERACTION_TYPE_PING = 1;
const INTERACTION_TYPE_APPLICATION_COMMAND = 2;
const INTERACTION_TYPE_MESSAGE_COMPONENT = 3;
const INTERACTION_TYPE_MODAL_SUBMIT = 5;

const INTERACTION_CALLBACK_TYPE_CHANNEL_MESSAGE_WITH_SOURCE = 4; // initial response

// Discord constants
const EPHEMERAL_FLAG = 64;

const DISCORD_PUBLIC_KEY =
  process.env.DISCORD_PUBLIC_KEY ?? import.meta.env.DISCORD_PUBLIC_KEY;
const DISCORD_BOT_TOKEN =
  process.env.DISCORD_BOT_TOKEN ?? import.meta.env.DISCORD_BOT_TOKEN;
const SUPABASE_URL =
  process.env.PUBLIC_SUPABASE_URL ?? import.meta.env.PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Seoul");

// Prefer server-side Supabase client if service role is provided (serverless only)
const serverDb =
  SUPABASE_SERVICE_ROLE_KEY && SUPABASE_URL
    ? createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : supabase;

type Interaction = {
  type: number;
  data?: any;
  member?: { user?: { id: string; username?: string } };
  user?: { id: string; username?: string };
  guild_id?: string;
  channel_id?: string;
};

// Utils
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function badRequest(message: string) {
  // Return an ephemeral interaction response instead of HTTP 400
  return ephemeral(message);
}

function ephemeral(content: string, embeds?: any[]) {
  return json({
    type: INTERACTION_CALLBACK_TYPE_CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content,
      flags: EPHEMERAL_FLAG,
      embeds: embeds ?? [],
    },
  });
}

// (Signature verification removed by request)

// Minimal REST helper for Discord API
async function discordFetch(path: string) {
  if (!DISCORD_BOT_TOKEN) throw new Error("DISCORD_BOT_TOKEN not set");
  const res = await fetch(`https://discord.com/api/v10${path}`, {
    headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord API error ${res.status}: ${text}`);
  }
  return res.json();
}

// Domain helpers (DB tables are assumed; adjust names/columns to your schema)
async function getRegisteredForumIdsForGuild(
  guildId: string,
): Promise<string[]> {
  const { data } = await serverDb
    .from("registered_forums")
    .select("channel_id")
    .eq("guild_id", guildId)
    .throwOnError();
  return (data ?? []).map((r: any) => r.channel_id);
}

async function upsertSubmission(payload: {
  guildId: string;
  forumChannelId: string;
  threadId: string;
  userId: string;
  messageId: string;
  messageLink: string;
  messagePreview?: string;
  dueDateISO?: string;
}) {
  await serverDb
    .from("submissions")
    .upsert(
      {
        guild_id: payload.guildId,
        forum_channel_id: payload.forumChannelId,
        thread_id: payload.threadId,
        user_id: payload.userId,
        message_id: payload.messageId,
        message_link: payload.messageLink,
        message_preview: payload.messagePreview ?? null,
        due_date: payload.dueDateISO ?? null,
      },
      { onConflict: "guild_id,forum_channel_id,thread_id,user_id" },
    )
    .throwOnError();
}

function parseMessageLink(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname !== "discord.com") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    // channels/<guild>/<channel>/<message>
    if (parts.length < 4 || parts[0] !== "channels") return null;
    const guildId = parts[1];
    const channelId = parts[2];
    const messageId = parts[3];
    return { guildId, channelId, messageId };
  } catch {
    return null;
  }
}

function parseDueDateFromThreadName(name: string): string | null {
  const m = name.match(/^\((\d{1,2})\/(\d{1,2})\)/);
  if (!m) return null;
  const thisYear = dayjs().year();
  const month = Number(m[1]);
  const day = Number(m[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = dayjs(
    `${thisYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  );
  return d.toISOString();
}

function isGuildAdmin(i: Interaction): boolean {
  const member: any = (i as any).member;
  if (!member) return false;
  const permsStr: string | undefined = member.permissions;
  let isAdmin = false;
  try {
    if (permsStr) {
      const ADMIN = 0x8n; // ADMINISTRATOR bit
      isAdmin = (BigInt(permsStr) & ADMIN) === ADMIN;
    }
  } catch {
    isAdmin = false;
  }
  return isAdmin;
}

async function handleStudyLog(i: Interaction) {
  const options = i.data?.options ?? [];
  const link = options.find((o: any) => o.name === "link")?.value as
    | string
    | undefined;
  if (!link) return ephemeral("메시지 링크 형식을 확인해 주세요.");

  const parsed = parseMessageLink(link);
  if (!parsed) return ephemeral("메시지 링크 형식을 확인해 주세요.");

  if (parsed.guildId !== i.guild_id) {
    return ephemeral("다른 서버의 메시지는 인증할 수 없습니다.");
  }

  // 2. fetch message
  let msg: any;
  try {
    msg = await discordFetch(
      `/channels/${parsed.channelId}/messages/${parsed.messageId}`,
    );
  } catch (e) {
    return ephemeral("해당 메시지를 볼 권한이 없거나 존재하지 않습니다.");
  }

  const invokerId = i.member?.user?.id ?? i.user?.id;
  if (!invokerId) return ephemeral("요청자 정보를 확인할 수 없습니다.");

  if (msg.author?.id !== invokerId) {
    return ephemeral("본인이 작성한 메시지만 인증할 수 있습니다.");
  }

  // 4. channel is thread, parent is registered forum
  // Need to fetch channel to ensure it's a thread and find parent_id
  let channel: any;
  try {
    channel = await discordFetch(`/channels/${parsed.channelId}`);
  } catch (e) {
    return ephemeral("해당 메시지를 볼 권한이 없거나 존재하지 않습니다.");
  }

  // thread types: 10 (news thread), 11 (public thread), 12 (private thread)
  const isThread =
    channel?.type === 10 || channel?.type === 11 || channel?.type === 12;
  if (!isThread || !channel?.parent_id) {
    return ephemeral("등록된 스터디 포럼의 스레드에서만 인증할 수 있습니다.");
  }

  const parentForumId = channel.parent_id as string;

  let forumIds: string[] = [];
  try {
    if (!i.guild_id) return ephemeral("길드 정보를 확인할 수 없습니다.");
    forumIds = await getRegisteredForumIdsForGuild(i.guild_id);
  } catch (e) {
    return ephemeral("일시적인 저장소 오류입니다. 잠시 후 다시 시도해 주세요.");
  }

  if (!forumIds.includes(parentForumId)) {
    return ephemeral("등록된 스터디 포럼의 스레드에서만 인증할 수 있습니다.");
  }

  // 5. parse due date from thread name
  const dueISO = parseDueDateFromThreadName(channel.name);
  if (!dueISO) {
    return ephemeral(
      "스레드 제목에 (M/D) 또는 (MM/DD) 형태의 주차 정보가 필요합니다.",
    );
  }

  // Upsert submission
  try {
    await upsertSubmission({
      guildId: i.guild_id!,
      forumChannelId: parentForumId,
      threadId: channel.id,
      userId: invokerId,
      messageId: parsed.messageId,
      messageLink: link,
      messagePreview:
        typeof msg.content === "string" ? msg.content.slice(0, 120) : undefined,
      dueDateISO: dueISO,
    });
  } catch (e) {
    return ephemeral("일시적인 저장소 오류입니다. 잠시 후 다시 시도해 주세요.");
  }

  const embeds = [
    {
      title: "✅ 체크인 처리 완료",
      description: msg.content ? `\n${msg.content.slice(0, 200)}` : undefined,
      fields: [
        { name: "포럼", value: `<#${parentForumId}>`, inline: true },
        { name: "스레드", value: channel.name ?? channel.id, inline: true },
        {
          name: "주차(마감)",
          value: dayjs(dueISO).format("YYYY-MM-DD"),
          inline: true,
        },
        { name: "메시지", value: link },
      ],
    },
  ];
  return ephemeral("체크인 완료", embeds);
}

async function handleStudyStats(i: Interaction) {
  const targetUserId =
    i.data?.options?.find((o: any) => o.name === "user")?.value ??
    i.member?.user?.id ??
    i.user?.id;
  if (!targetUserId || !i.guild_id)
    return ephemeral("요청 정보를 확인할 수 없습니다.");

  // Sum submissions by forum and overall
  let data: any[] | null = null;
  try {
    const res = await serverDb
      .from("submissions")
      .select("forum_channel_id, thread_id, due_date")
      .eq("guild_id", i.guild_id)
      .eq("user_id", targetUserId)
      .throwOnError();
    data = res.data;
  } catch (e: any) {
    return ephemeral(`저장소 오류: ${e?.message ?? "다시 시도해 주세요."}`);
  }

  const total = data?.length ?? 0;
  const byForum: Record<string, number> = {};
  const byDue: { due: string; threadId: string }[] = [];
  for (const row of data ?? []) {
    const forum = row.forum_channel_id as string;
    byForum[forum] = (byForum[forum] ?? 0) + 1;
    if (row.due_date)
      byDue.push({
        due: row.due_date as string,
        threadId: row.thread_id as string,
      });
  }

  // recent N
  const N = 6;
  byDue.sort(
    (
      a: { due: string; threadId: string },
      b: { due: string; threadId: string },
    ) => (a.due > b.due ? -1 : 1),
  );
  const recent = byDue.slice(0, N);
  const recentLine =
    recent.map((r) => `${dayjs(r.due).format("MM/DD")}: ✅`).join("  •  ") ||
    "기록 없음";

  const forumSummary =
    Object.entries(byForum)
      .map(([forumId, count]) => `${count} × <#${forumId}>`)
      .join("\n") || "-";

  const embeds = [
    {
      title: "스터디 통계",
      fields: [
        { name: "총 체크인", value: String(total), inline: true },
        { name: "최근 주차", value: recentLine },
        { name: "포럼별", value: forumSummary },
      ],
    },
  ];
  return ephemeral("통계", embeds);
}

async function handleStudyDashboard(i: Interaction) {
  if (!i.guild_id) return ephemeral("길드 정보를 확인할 수 없습니다.");

  try {
    // My status
    const userId = i.member?.user?.id ?? i.user?.id;
    const { data: myRows } = await serverDb
      .from("submissions")
      .select("due_date")
      .eq("guild_id", i.guild_id)
      .eq("user_id", userId!)
      .throwOnError();
    const myTotal = myRows?.length ?? 0;
    const recentMy = (myRows ?? [])
      .filter((r: any) => r.due_date)
      .map((r: any) => r.due_date as string)
      .sort((a: string, b: string) => (a > b ? -1 : 1))
      .slice(0, 6);

    // Latest week overview: pick latest due across guild
    const { data: allRows } = await serverDb
      .from("submissions")
      .select("due_date")
      .eq("guild_id", i.guild_id)
      .not("due_date", "is", null)
      .throwOnError();

    let latestDue: string | null = null;
    if (allRows && allRows.length > 0) {
      const dueList: string[] = (allRows as any[])
        .map((r: any) => r.due_date as string)
        .filter(Boolean);
      latestDue =
        [...new Set(dueList)].sort((a: string, b: string) =>
          a > b ? -1 : 1,
        )[0] ?? null;
    }

    let latestCount = 0;
    if (latestDue) {
      const { count } = await serverDb
        .from("submissions")
        .select("*", { count: "exact", head: true })
        .eq("guild_id", i.guild_id)
        .eq("due_date", latestDue)
        .throwOnError();
      latestCount = count ?? 0;
    }

    // Recent 4 weeks summary
    const recentDueList = (
      [
        ...new Set(
          ((allRows ?? []) as any[]).map((r: any) => r.due_date as string),
        ),
      ] as string[]
    )
      .filter(Boolean)
      .sort((a: string, b: string) => (a > b ? -1 : 1))
      .slice(0, 4);

    const perWeekCounts: string[] = [];
    for (const due of recentDueList) {
      const { count } = await serverDb
        .from("submissions")
        .select("*", { count: "exact", head: true })
        .eq("guild_id", i.guild_id)
        .eq("due_date", due)
        .throwOnError();
      perWeekCounts.push(
        `${dayjs(due as string).format("MM/DD")}: ${count ?? 0}`,
      );
    }

    const embeds = [
      {
        title: "스터디 대시보드",
        fields: [
          {
            name: "내 현황",
            value: `총 ${myTotal}회, 최근 6주 중 ${recentMy.length}회`,
          },
          {
            name: "이번 주 요약",
            value: latestDue
              ? `${dayjs(latestDue).format("MM/DD")}: ${latestCount}회`
              : "데이터 없음",
          },
          {
            name: "최근 주차",
            value: perWeekCounts.join("  •  ") || "데이터 없음",
          },
        ],
      },
    ];
    return ephemeral("대시보드", embeds);
  } catch (e: any) {
    return ephemeral(`저장소 오류: ${e?.message ?? "다시 시도해 주세요."}`);
  }
}

async function handleForumRegister(i: Interaction) {
  // Validate channel type via Discord API
  if (!i.channel_id || !i.guild_id)
    return ephemeral("길드/채널 정보를 확인할 수 없습니다.");

  // Permission check: admin only
  if (!isGuildAdmin(i)) {
    return ephemeral("이 명령은 관리자만 실행할 수 있습니다.");
  }
  let channel: any;
  try {
    channel = await discordFetch(`/channels/${i.channel_id}`);
  } catch (e) {
    return ephemeral("채널 정보를 가져올 수 없습니다.");
  }

  // If invoked from a thread, resolve its parent forum
  // Thread types: 10/11/12
  let targetChannelId: string = i.channel_id;
  let targetChannelName: string | null = channel?.name ?? null;
  if (channel?.type === 10 || channel?.type === 11 || channel?.type === 12) {
    if (!channel?.parent_id) {
      return ephemeral("현재 채널은 Forum 타입이 아닙니다.");
    }
    try {
      const parent = await discordFetch(`/channels/${channel.parent_id}`);
      if (parent?.type !== 15) {
        return ephemeral("현재 채널은 Forum 타입이 아닙니다.");
      }
      targetChannelId = parent.id as string;
      targetChannelName = parent.name as string;
    } catch (e) {
      return ephemeral("부모 포럼 정보를 가져올 수 없습니다.");
    }
  } else if (channel?.type !== 15) {
    // Not a forum, not a thread
    return ephemeral("현재 채널은 Forum 타입이 아닙니다.");
  }

  // Permission: admin or configured role. Minimal: require admin (=0x8 bit in permissions). For simplicity, trust Discord to restrict command via Permission, but also check member perms if sent.
  // Skipping deep permission checks due to interaction payload limitations in webhooks.

  try {
    await serverDb
      .from("registered_forums")
      .upsert(
        {
          guild_id: i.guild_id,
          channel_id: targetChannelId,
          channel_name: targetChannelName ?? null,
        },
        { onConflict: "guild_id,channel_id" },
      )
      .throwOnError();
  } catch (e: any) {
    return ephemeral(`저장소 오류: ${e?.message ?? "다시 시도해 주세요."}`);
  }

  return ephemeral("등록 완료", [
    {
      title: "스터디 포럼 등록",
      description: `<#${targetChannelId}> 가 등록되었습니다.`,
    },
  ]);
}

async function handleForumList(i: Interaction) {
  if (!i.guild_id) return ephemeral("길드 정보를 확인할 수 없습니다.");
  let data: any[] | null = null;
  try {
    const res = await serverDb
      .from("registered_forums")
      .select("channel_id, channel_name")
      .eq("guild_id", i.guild_id)
      .order("channel_name", { ascending: true })
      .throwOnError();
    data = res.data;
  } catch (e: any) {
    return ephemeral(`저장소 오류: ${e?.message ?? "다시 시도해 주세요."}`);
  }

  const lines = (data ?? []).map(
    (r: any) => `• <#${r.channel_id}> (${r.channel_name ?? ""})`,
  );
  const embeds = [
    { title: "등록된 스터디 포럼", description: lines.join("\n") || "없음" },
  ];
  return ephemeral("포럼 목록", embeds);
}

function isStudyNamespace(name?: string) {
  if (!name) return false;
  return (
    name === "study" || name.startsWith("study ") || name.startsWith("study-")
  );
}

export const POST: APIRoute = async ({ request }) => {
  if (!DISCORD_PUBLIC_KEY) {
    return ephemeral(
      "서버 설정 오류: DISCORD_PUBLIC_KEY가 설정되지 않았습니다.",
    );
  }
  const cloned = request.clone();
  const valid = await isValidRequest(
    request,
    DISCORD_PUBLIC_KEY,
    PlatformAlgorithm.Vercel,
  );
  if (!valid) return new Response("Invalid signature", { status: 401 });
  const rawBody = await cloned.text();
  let interaction: Interaction;
  try {
    interaction = JSON.parse(rawBody) as Interaction;
  } catch {
    return ephemeral("요청 본문을 파싱하는 중 오류가 발생했습니다.");
  }

  if (interaction.type === INTERACTION_TYPE_PING) {
    return json({ type: 1 });
  }

  if (interaction.type === INTERACTION_TYPE_APPLICATION_COMMAND) {
    const cmdName = interaction.data?.name as string | undefined;

    // We expect group command "study" with subcommands
    if (cmdName === "study") {
      const sub = interaction.data?.options?.[0];
      const subName = sub?.name as string | undefined;
      if (!subName) return badRequest("Unknown subcommand");

      switch (subName) {
        case "log":
          // normalize options
          interaction.data = { ...sub };
          return await handleStudyLog(interaction);
        case "stats":
          interaction.data = { ...sub };
          return await handleStudyStats(interaction);
        case "dashboard":
          interaction.data = { ...sub };
          return await handleStudyDashboard(interaction);
        case "forum": {
          const subsub = sub?.options?.[0]?.name as string | undefined;
          if (subsub === "register") {
            return await handleForumRegister(interaction);
          }
          if (subsub === "list") {
            return await handleForumList(interaction);
          }
          return badRequest("Unknown forum subcommand");
        }
        default:
          return badRequest("Unknown subcommand");
      }
    }

    // Fallback if commands were registered without the study group
    if (isStudyNamespace(cmdName)) {
      // Not supported explicitly; require the single top-level /study group
      return ephemeral("모든 명령은 /study 그룹 하위로 제공됩니다.");
    }

    return badRequest("Unknown command");
  }

  if (
    interaction.type === INTERACTION_TYPE_MESSAGE_COMPONENT ||
    interaction.type === INTERACTION_TYPE_MODAL_SUBMIT
  ) {
    return ephemeral("이 상호작용은 지원되지 않습니다.");
  }

  return badRequest("Unsupported interaction type");
};
