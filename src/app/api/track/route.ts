import { NextRequest, NextResponse } from "next/server";
import { notifyNewVisitor, sendTrackingEmail } from "@/lib/notify";

const notifiedVisitors = new Set<string>();

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "unknown";

  let question = "", answer = "", type = "";
  try {
    const body = await req.json();
    question = body.question || "";
    answer = body.answer || "";
    type = body.type || "";
  } catch {
    return NextResponse.json({ ok: false });
  }

  const timestamp = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  });

  // Log to console as backup
  console.log(
    JSON.stringify({
      event: "chat_interaction",
      timestamp,
      ip,
      type,
      question: question?.slice(0, 300),
    })
  );

  // Email alert for new visitor
  if (!notifiedVisitors.has(ip)) {
    notifiedVisitors.add(ip);
    notifyNewVisitor(ip, question).catch(console.error);
  }

  // Email every interaction for permanent record
  sendTrackingEmail(ip, timestamp, type, question, answer).catch(console.error);

  return NextResponse.json({ ok: true });
}
