import { describe, expect, it, vi } from "vitest";
import {
	buildMessageNotification,
	selectMessageRecipients,
} from "./message-notifications";

// Loading chat users reaches Clerk, whose env check throws without a .env.
vi.mock("./chat-users", () => ({ loadChatUsers: vi.fn() }));

const athletes = [
	{ id: "ath_me", userId: "user_me", role: "member" },
	{ id: "ath_b", userId: "user_b", role: "member" },
	{ id: "ath_c", userId: "user_c", role: "member" },
	{ id: "ath_coach", userId: "user_coach", role: "admin" },
];

const channel = (
	kind: "everyone" | "group" | "direct_message",
	{
		groupId = null,
		userIds = [],
	}: { groupId?: string | null; userIds?: string[] } = {},
) => ({
	kind,
	groupId,
	members: userIds.map((userId) => ({ userId })),
});

const message = {
	channelId: "chn_1",
	authorUserId: "user_me",
	parentId: null,
	text: "Boats out at 6",
	gif: null,
	forwardedFromId: null,
};

describe("selectMessageRecipients", () => {
	it("reaches everyone in the everyone channel except the author", () => {
		expect(
			selectMessageRecipients(channel("everyone"), athletes, [], "user_me"),
		).toEqual(["ath_b", "ath_c", "ath_coach"]);
	});

	it("reaches a group's members and admins, not other athletes", () => {
		expect(
			selectMessageRecipients(
				channel("group", { groupId: "grp_masters" }),
				athletes,
				["ath_me", "ath_b"],
				"user_me",
			),
		).toEqual(["ath_b", "ath_coach"]);
	});

	it("reaches only a direct message's members, even with an admin outside it", () => {
		expect(
			selectMessageRecipients(
				channel("direct_message", { userIds: ["user_me", "user_c"] }),
				athletes,
				[],
				"user_me",
			),
		).toEqual(["ath_c"]);
	});

	it("never notifies the author", () => {
		expect(
			selectMessageRecipients(channel("everyone"), athletes, [], "user_coach"),
		).not.toContain("ath_coach");
	});

	it("reaches only the thread's people with a thread reply, never the replier", () => {
		expect(
			selectMessageRecipients(channel("everyone"), athletes, [], "user_me", [
				"user_b",
				"user_me",
			]),
		).toEqual(["ath_b"]);
	});

	it("skips a thread participant who can no longer read the channel", () => {
		expect(
			selectMessageRecipients(
				channel("group", { groupId: "grp_masters" }),
				athletes,
				["ath_me"],
				"user_me",
				["user_c"],
			),
		).toEqual([]);
	});
});

describe("buildMessageNotification", () => {
	it("titles a direct message with the author's name", () => {
		expect(buildMessageNotification(message, "Avery Coxwell", null).title).toBe(
			"Avery Coxwell",
		);
	});

	it("titles a channel message with the author and the channel", () => {
		const title = buildMessageNotification(
			message,
			"Avery Coxwell",
			"Masters",
		).title;
		expect(title).toContain("Avery Coxwell");
		expect(title).toContain("Masters");
	});

	it("shows the message text, or the GIF when there is no text", () => {
		expect(buildMessageNotification(message, "Avery Coxwell", null).body).toBe(
			"Boats out at 6",
		);
		expect(
			buildMessageNotification(
				{ ...message, text: null, gif: "nailed it" },
				"Avery Coxwell",
				null,
			).body,
		).toContain("nailed it");
	});

	it("names the photos when there is no text, and shows the text when there is", () => {
		expect(
			buildMessageNotification(
				{ ...message, text: null, attachments: [{ name: null }] },
				"Avery Coxwell",
				null,
			).body,
		).toBe("Photo");
		expect(
			buildMessageNotification(
				{
					...message,
					text: null,
					attachments: [{ name: null }, { name: null }, { name: null }],
				},
				"Avery Coxwell",
				null,
			).body,
		).toBe("3 photos");
		expect(
			buildMessageNotification(
				{ ...message, attachments: [{ name: null }, { name: null }] },
				"Avery Coxwell",
				null,
			).body,
		).toBe("Boats out at 6");
	});

	it("names a single file, and counts several files or a mix", () => {
		expect(
			buildMessageNotification(
				{ ...message, text: null, attachments: [{ name: "Lineups.pdf" }] },
				"Avery Coxwell",
				null,
			).body,
		).toContain("Lineups.pdf");
		expect(
			buildMessageNotification(
				{
					...message,
					text: null,
					attachments: [{ name: "Lineups.pdf" }, { name: "Waivers.zip" }],
				},
				"Avery Coxwell",
				null,
			).body,
		).toBe("2 files");
		expect(
			buildMessageNotification(
				{
					...message,
					text: null,
					attachments: [
						{ name: null },
						{ name: "Lineups.pdf" },
						{ name: null },
					],
				},
				"Avery Coxwell",
				null,
			).body,
		).toBe("3 files");
		expect(
			buildMessageNotification(
				{ ...message, attachments: [{ name: "Lineups.pdf" }] },
				"Avery Coxwell",
				null,
			).body,
		).toBe("Boats out at 6");
	});

	it("says a forward with no note is a forward", () => {
		expect(
			buildMessageNotification(
				{ ...message, text: null, forwardedFromId: "msg_source" },
				"Avery Coxwell",
				null,
			).body,
		).toContain("Forwarded");
	});

	it("opens the channel for a channel message and the thread for a reply", () => {
		expect(buildMessageNotification(message, "Avery Coxwell", null).url).toBe(
			"/chat/chn_1",
		);
		expect(
			buildMessageNotification(
				{ ...message, parentId: "msg_root" },
				"Avery Coxwell",
				null,
			).url,
		).toBe("/chat/chn_1?thread=msg_root");
	});

	it("groups and mutes per channel", () => {
		const other = buildMessageNotification(
			{ ...message, channelId: "chn_2" },
			"Avery Coxwell",
			null,
		);
		const notification = buildMessageNotification(
			message,
			"Avery Coxwell",
			null,
		);
		expect(notification.tag).not.toBe(other.tag);
		expect(notification.scope).toBe("channel:chn_1");
	});
});
