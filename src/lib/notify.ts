import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const WHATSAPP_PHONE = process.env.WHATSAPP_PHONE || "";
const WHATSAPP_APIKEY = process.env.WHATSAPP_APIKEY || "";
const ALERT_EMAIL = process.env.ALERT_EMAIL || "";

export async function notifyTokensExhausted(
  failedModels: string[],
  userQuestion: string
) {
  const message = `Neural Map Alert: All models exhausted.\nModels tried: ${failedModels.join(", ")}\nUser question: "${userQuestion.slice(0, 100)}"`;
  await sendAlert("Neural Map: All models exhausted", message);
}

export async function notifyNewVisitor(
  ip: string,
  question: string
) {
  const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const message = `New visitor on Neural Map!\n\nTime: ${timestamp}\nIP: ${ip}\nFirst question: "${question.slice(0, 200)}"`;
  await sendAlert("Neural Map: New visitor chatting", message);
}

export async function sendTrackingEmail(
  ip: string,
  timestamp: string,
  type: string,
  question: string,
  answer: string
) {
  if (!resend || !ALERT_EMAIL) return;

  const subject = `Neural Map [${type}]: ${question.slice(0, 60)}`;
  const text = `Time: ${timestamp}\nIP: ${ip}\nType: ${type}\n\nQuestion:\n${question}\n\nResponse:\n${answer?.slice(0, 1000) || "(no response)"}`;

  try {
    await resend.emails.send({
      from: "Neural Map <onboarding@resend.dev>",
      to: ALERT_EMAIL,
      subject,
      text,
    });
  } catch (e) {
    console.error("Tracking email failed:", e);
  }
}

async function sendAlert(subject: string, message: string) {
  // WhatsApp via Callmebot
  if (WHATSAPP_PHONE && WHATSAPP_APIKEY) {
    try {
      const encoded = encodeURIComponent(message);
      await fetch(
        `https://api.callmebot.com/whatsapp.php?phone=${WHATSAPP_PHONE}&text=${encoded}&apikey=${WHATSAPP_APIKEY}`
      );
      console.log("WhatsApp alert sent");
    } catch (e) {
      console.error("WhatsApp alert failed:", e);
    }
  }

  // Email via Resend
  if (resend && ALERT_EMAIL) {
    try {
      await resend.emails.send({
        from: "Neural Map <onboarding@resend.dev>",
        to: ALERT_EMAIL,
        subject,
        text: message,
      });
      console.log("Email alert sent");
    } catch (e) {
      console.error("Email alert failed:", e);
    }
  }
}
