import { describe, expect, it, vi } from "vitest";
import {
	buildMentionNotification,
	buildMessageNotification,
	selectMessageRecipients,
	separateMentionedRecipients,
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

describe("separateMentionedRecipients", () => {
	it("tells everyone the ordinary way when nobody is mentioned", () => {
		expect(
			separateMentionedRecipients({
				channel: channel("everyone"),
				athletes,
				groupMemberIds: [],
				authorUserId: "user_me",
				mentionedUserIds: [],
			}),
		).toEqual({
			mentioned: [],
			others: selectMessageRecipients(
				channel("everyone"),
				athletes,
				[],
				"user_me",
			),
		});
	});

	it("reaches a mentioned person who is not in the thread", () => {
		const { mentioned, others } = separateMentionedRecipients({
			channel: channel("everyone"),
			athletes,
			groupMemberIds: [],
			authorUserId: "user_me",
			threadUserIds: ["user_b"],
			mentionedUserIds: ["user_c"],
		});
		expect(mentioned).toEqual(["ath_c"]);
		expect(others).toEqual(["ath_b"]);
	});

	it("tells a mentioned thread participant once, as a mention", () => {
		const { mentioned, others } = separateMentionedRecipients({
			channel: channel("everyone"),
			athletes,
			groupMemberIds: [],
			authorUserId: "user_me",
			threadUserIds: ["user_b", "user_c"],
			mentionedUserIds: ["user_b"],
		});
		expect(mentioned).toEqual(["ath_b"]);
		expect(others).not.toContain("ath_b");
		expect(others).toContain("ath_c");
	});

	it("never notifies the author, even when they mention themselves", () => {
		const { mentioned, others } = separateMentionedRecipients({
			channel: channel("everyone"),
			athletes,
			groupMemberIds: [],
			authorUserId: "user_me",
			mentionedUserIds: ["user_me"],
		});
		expect(mentioned).not.toContain("ath_me");
		expect(others).not.toContain("ath_me");
	});

	it("tells nobody who cannot read the channel, mentioned or not", () => {
		const group = separateMentionedRecipients({
			channel: channel("group", { groupId: "grp_masters" }),
			athletes,
			groupMemberIds: ["ath_me", "ath_b"],
			authorUserId: "user_me",
			mentionedUserIds: ["user_c"],
		});
		expect(group.mentioned).not.toContain("ath_c");
		expect(group.others).not.toContain("ath_c");

		const directMessage = separateMentionedRecipients({
			channel: channel("direct_message", { userIds: ["user_me", "user_b"] }),
			athletes,
			groupMemberIds: [],
			authorUserId: "user_me",
			mentionedUserIds: ["user_coach"],
		});
		expect(directMessage.mentioned).not.toContain("ath_coach");
		expect(directMessage.others).not.toContain("ath_coach");
	});
});

describe("buildMentionNotification", () => {
	it("says who mentioned you and in which channel", () => {
		const title = buildMentionNotification(
			message,
			"Avery Coxwell",
			"Masters",
		).title;
		expect(title).toContain("Avery Coxwell");
		expect(title).toContain("mentioned you");
		expect(title).toContain("Masters");
	});

	it("says who mentioned you in a direct message", () => {
		expect(buildMentionNotification(message, "Avery Coxwell", null).title).toBe(
			"Avery Coxwell mentioned you",
		);
	});

	it("is not replaced by an ordinary message in the same chat", () => {
		expect(
			buildMentionNotification(message, "Avery Coxwell", null).tag,
		).not.toBe(buildMessageNotification(message, "Avery Coxwell", null).tag);
	});

	it("gets through a muted chat", () => {
		expect(
			buildMentionNotification(message, "Avery Coxwell", null).scope,
		).toBeUndefined();
	});

	it("shows the same text and opens the same place as the ordinary push", () => {
		const reply = { ...message, parentId: "msg_root" };
		const mention = buildMentionNotification(reply, "Avery Coxwell", null);
		const ordinary = buildMessageNotification(reply, "Avery Coxwell", null);
		expect(mention.body).toBe(ordinary.body);
		expect(mention.url).toBe(ordinary.url);
	});
});
