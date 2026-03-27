import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Stage labels (mirrored from src/lib/stages.ts)
const STAGES: Record<string, string> = {
  new_inquiry: "新詢問",
  initial_screening: "初步篩選",
  first_contact: "已聯繫",
  needs_assessment: "需求確認",
  subsidy_check: "補助資格評估",
  site_visit_scheduled: "已約現勘",
  site_visit_done: "現勘完成",
  designing: "出圖中",
  design_presented: "已出圖",
  revision: "修改中",
  quote_sent: "報價中",
  negotiating: "議價中",
  contract_signed: "已簽約",
  collecting_consent: "住戶同意徵集",
  structural_assessment: "結構評估中",
  subsidy_submitted: "補助送件",
  subsidy_approved: "補助核准",
  pre_construction: "施工準備",
  under_construction: "施工中",
  inspection: "驗收",
  completed: "完工",
  subsidy_reimbursement: "補助請款",
  followup: "售後追蹤",
  referral_generated: "已推薦",
  on_hold: "暫緩",
  lost: "未成交",
};

const LEAD_SOURCES: Record<string, string> = {
  website: "官網",
  line: "LINE",
  referral: "推薦",
  "104": "104",
  walk_in: "現場",
  social_media: "社群媒體",
  "591": "591",
  other: "其他",
};

const BUDGET_RANGES: Record<string, string> = {
  under_30: "30萬以下",
  "30_50": "30-50萬",
  "50_80": "50-80萬",
  "80_120": "80-120萬",
  over_120: "120萬+",
  undecided: "未定",
};

const PAYMENT_TYPES: Record<string, string> = {
  deposit: "訂金",
  installment: "期款",
  final: "尾款",
  other: "其他",
};

function getStageLabel(code: string): string {
  return STAGES[code] || code;
}

interface DiscordEmbed {
  title?: string;
  description: string;
  color: number;
  timestamp?: string;
  footer?: { text: string };
}

async function sendDiscordMessage(embed: DiscordEmbed): Promise<void> {
  const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
  const channelId = Deno.env.get("DISCORD_CHANNEL_ID");

  if (!botToken || !channelId) {
    throw new Error("Missing DISCORD_BOT_TOKEN or DISCORD_CHANNEL_ID env vars");
  }

  const url = `https://discord.com/api/v10/channels/${channelId}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ embeds: [embed] }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Discord API error ${response.status}: ${text}`);
  }
}

serve(async (req) => {
  try {
    const payload = await req.json();
    const { type, table, record, old_record } = payload;

    let embed: DiscordEmbed | null = null;

    if (table === "customers" && type === "INSERT") {
      // New customer
      const name = record.name || "未知";
      const district = record.district || "—";
      const leadSource = LEAD_SOURCES[record.lead_source] || record.lead_source || "—";
      const budgetRange = BUDGET_RANGES[record.budget_range] || record.budget_range || "—";

      embed = {
        description: `🆕 **新客戶**: ${name} | ${district} | ${leadSource} | ${budgetRange}`,
        color: 0x3b82f6, // blue
        timestamp: new Date().toISOString(),
        footer: { text: "SNAP 設計 CRM" },
      };
    } else if (table === "customers" && type === "UPDATE") {
      // Stage change — only notify if current_stage changed
      if (record.current_stage !== old_record?.current_stage) {
        const name = record.name || "未知";
        const oldLabel = getStageLabel(old_record?.current_stage || "");
        const newLabel = getStageLabel(record.current_stage || "");

        embed = {
          description: `🔄 **${name}**: ${oldLabel} → ${newLabel}`,
          color: 0xf97316, // orange
          timestamp: new Date().toISOString(),
          footer: { text: "SNAP 設計 CRM" },
        };
      }
    } else if (table === "activity_log" && type === "INSERT") {
      // New activity — need to look up customer name
      const customerId = record.customer_id;
      const activityType = record.activity_type || "活動";
      const content = record.content || "";
      const preview = content.length > 80 ? content.substring(0, 80) + "…" : content;

      // Fetch customer name from Supabase
      const supabaseUrl = Deno.env.get("CRM_SUPABASE_URL");
      const supabaseKey = Deno.env.get("CRM_SERVICE_ROLE_KEY");
      let customerName = "未知客戶";

      if (supabaseUrl && supabaseKey && customerId) {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/customers?id=eq.${customerId}&select=name`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.[0]?.name) customerName = data[0].name;
        }
      }

      embed = {
        description: `📝 **${customerName}**: ${activityType} — ${preview}`,
        color: 0xeab308, // yellow
        timestamp: new Date().toISOString(),
        footer: { text: "SNAP 設計 CRM" },
      };
    } else if (table === "payments" && type === "INSERT") {
      // New payment — look up customer name
      const customerId = record.customer_id;
      const amount = record.amount || 0;
      const paymentType = PAYMENT_TYPES[record.payment_type] || record.payment_type || "款項";

      const supabaseUrl = Deno.env.get("CRM_SUPABASE_URL");
      const supabaseKey = Deno.env.get("CRM_SERVICE_ROLE_KEY");
      let customerName = "未知客戶";

      if (supabaseUrl && supabaseKey && customerId) {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/customers?id=eq.${customerId}&select=name`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.[0]?.name) customerName = data[0].name;
        }
      }

      embed = {
        description: `💰 **${customerName}**: ${paymentType} NT$${amount.toLocaleString()}`,
        color: 0x22c55e, // green
        timestamp: new Date().toISOString(),
        footer: { text: "SNAP 設計 CRM" },
      };
    }

    if (embed) {
      await sendDiscordMessage(embed);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // No-op for unhandled event types
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("discord-notify error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
