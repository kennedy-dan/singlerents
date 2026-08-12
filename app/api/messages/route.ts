import { z } from "zod";
import { db } from "../../../lib/db";
import { requireUser } from "../../../lib/auth";
import { bad, unauthorized } from "../../../lib/http";
import { NextResponse } from "next/server";
import { sendEmail, emailParagraph } from "../../../lib/email";
export async function GET(req) {
  try {
    const u = await requireUser();
    const id = new URL(req.url).searchParams.get("conversationId");
    if (!id) {
      const conversations = await db.conversation.findMany({
        where: { OR: [{ tenantId: u.sub }, { landlordId: u.sub }] },
        include: {
          tenant: { select: { id: true, name: true } },
          landlord: { select: { id: true, name: true } },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ conversations });
    }
    const conversation = await db.conversation.findFirst({
      where: { id, OR: [{ tenantId: u.sub }, { landlordId: u.sub }] },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          include: { sender: { select: { name: true } } },
        },
      },
    });
    return conversation ? NextResponse.json({ conversation }) : unauthorized();
  } catch {
    return unauthorized();
  }
}
export async function POST(req) {
  try {
    const u = await requireUser();
    const { conversationId, listingId, body } = z
      .object({
        conversationId: z.string().optional(),
        listingId: z.string().optional(),
        body: z.string().min(1).max(2000),
      })
      .parse(await req.json());
    let conversation;
    if (conversationId)
      conversation = await db.conversation.findFirst({
        where: {
          id: conversationId,
          OR: [{ tenantId: u.sub }, { landlordId: u.sub }],
        },
      });
    else if (listingId && u.role === "TENANT") {
      const listing = await db.listing.findUnique({ where: { id: listingId } });
      if (listing)
        conversation = await db.conversation.upsert({
          where: {
            tenantId_landlordId_listingId: {
              tenantId: u.sub,
              landlordId: listing.landlordId,
              listingId,
            },
          },
          update: {},
          create: {
            tenantId: u.sub,
            landlordId: listing.landlordId,
            listingId,
          },
        });
    }
    if (!conversation) return unauthorized();
    const message = await db.message.create({
      data: {
        conversationId: conversation.id,
        senderId: u.sub,
        body,
      },
    });
    const recipient =
      conversation.tenantId === u.sub
        ? conversation.landlordId
        : conversation.tenantId;
    const recipientUser = await db.user.findUnique({
      where: { id: recipient },
      select: { email: true },
    });
    await db.notification.create({
      data: {
        userId: recipient,
        type: "MESSAGE",
        body: "You have a new message.",
      },
    });
    const { publish } = await import("../../../lib/events");
    void publish(recipient, "message", {
      message,
      conversationId: conversation.id,
    }).catch((error) =>
      console.error("Unable to publish message event:", error),
    );
    void publish(recipient, "notification", {
      type: "MESSAGE",
      body: "You have a new message.",
    }).catch((error) =>
      console.error("Unable to publish notification event:", error),
    );
    void sendEmail({
      to: recipientUser?.email,
      subject: "You have a new SingleRents message",
      text: `${u.email} sent you a message: ${body}`,
      html: `${emailParagraph("You have a new message on SingleRents.")}${emailParagraph(body)}`,
    });
    return NextResponse.json(
      { message, conversationId: conversation.id },
      { status: 201 },
    );
  } catch (e) {
    console.error("Message creation error:", e);
    return bad("Invalid message");
  }
}
