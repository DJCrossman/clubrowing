import { describe, expect, it } from "vitest";
import type { ChatUser } from "./chat-user-names";
import {
	collectMessageUserIds,
	type MessageRow,
	mapForwardedMessage,
	mapQuotedMessage,
	mapToMessageDto,
	resolveForwardSourceId,
} from "./map-to-message-dto";

const at = (minute: number) => new Date(Date.UTC(2026, 9, 23, 6, minute));
const user = (id: string, name: string, initials: string): ChatUser => ({
	id,
	name,
	initials,
});
const sarah = user("user_sarah", "Sarah Chen", "SC");
const mike = user("user_mike", "Mike Lee", "ML");
const priya = user("user_priya", "Priya Shah", "PS");
const tom = user("user_tom", "Tom Ward", "TW");
const users = new Map([sarah, mike, priya, tom].map((u) => [u.id, u]));

const messageRow = (overrides: Partial<MessageRow> = {}): MessageRow => ({
	id: "msg_1",
	channelId: "chan_everyone",
	authorUserId: sarah.id,
	parentId: null,
	text: "Water's flat, see you at 6",
	gif: null,
	quotedMessageId: null,
	forwardedFromId: null,
	createdAt: at(0),
	updatedAt: at(0),
	editedAt: null,
	deletedAt: null,
	reactions: [],
	quotedMessage: null,
	forwardedFrom: null,
	replies: [],
	attachments: [],
	...overrides,
});

const viewer = { userId: sarah.id, isAdmin: false };

describe("resolveForwardSourceId", () => {
	it("forwards an original message as itself and a forward as its original", () => {
		expect(resolveForwardSourceId({ id: "msg_1", forwardedFromId: null })).toBe(
			"msg_1",
		);
		expect(
			resolveForwardSourceId({ id: "msg_2", forwardedFromId: "msg_1" }),
		).toBe("msg_1");
	});
});

describe("mapForwardedMessage", () => {
	const original = (
		channel: {
			kind: "everyone" | "group" | "direct_message";
			groupId: string | null;
		},
		deletedAt: Date | null = null,
	): MessageRow["forwardedFrom"] => ({
		id: "msg_original",
		text: "Regatta entries close Friday",
		gif: null,
		deletedAt,
		createdAt: at(1),
		authorUserId: mike.id,
		channel,
		attachments: [{ name: null }, { name: "Entry form.pdf" }, { name: null }],
	});

	it("labels the source channel and resolves the original author", () => {
		expect(
			mapForwardedMessage(original({ kind: "everyone", groupId: null }), users),
		).toEqual({
			id: "msg_original",
			channelName: "Everyone",
			author: mike,
			text: "Regatta entries close Friday",
			gif: null,
			photoCount: 2,
			fileCount: 1,
			fileName: "Entry form.pdf",
			createdAt: at(1).toISOString(),
			deleted: false,
		});
	});

	it("names direct message sources without revealing who was in them", () => {
		expect(
			mapForwardedMessage(
				original({ kind: "direct_message", groupId: null }),
				users,
			)?.channelName,
		).toBe("a direct message");
	});

	it("hides the content of a deleted original", () => {
		expect(
			mapForwardedMessage(
				original({ kind: "everyone", groupId: null }, at(5)),
				users,
			),
		).toMatchObject({
			deleted: true,
			text: null,
			gif: null,
			photoCount: 0,
			fileCount: 0,
			fileName: null,
		});
	});
});

describe("mapQuotedMessage", () => {
	it("maps the quoted author and hides deleted text", () => {
		const quoted = {
			id: "msg_q",
			text: "Who has the trailer keys?",
			gif: null,
			deletedAt: null,
			authorUserId: priya.id,
			attachments: [
				{ name: null },
				{ name: "Trailer checklist.docx" },
				{ name: "Keys.txt" },
			],
		};
		expect(mapQuotedMessage(quoted, users)).toMatchObject({
			author: priya,
			text: "Who has the trailer keys?",
			photoCount: 1,
			fileCount: 2,
			fileName: "Trailer checklist.docx",
			deleted: false,
		});
		expect(
			mapQuotedMessage({ ...quoted, deletedAt: at(3) }, users),
		).toMatchObject({
			deleted: true,
			text: null,
			photoCount: 0,
			fileCount: 0,
			fileName: null,
		});
	});

	it("falls back to a placeholder for someone who is no longer around", () => {
		expect(
			mapQuotedMessage(
				{
					id: "msg_q",
					text: "Hi",
					gif: null,
					deletedAt: null,
					authorUserId: "user_gone",
					attachments: [],
				},
				users,
			)?.author,
		).toEqual({
			id: "user_gone",
			name: "Former member",
			initials: "?",
		});
	});
});

describe("mapToMessageDto", () => {
	it("groups reactions by emoji with names and my reaction", () => {
		const dto = mapToMessageDto(
			messageRow({
				reactions: [
					{ emoji: "✅", userId: mike.id },
					{ emoji: "👀", userId: priya.id },
					{ emoji: "✅", userId: sarah.id },
				],
			}),
			viewer,
			users,
		);
		expect(dto.reactions).toEqual([
			{ emoji: "✅", count: 2, names: ["Mike Lee", "You"], reactedByMe: true },
			{ emoji: "👀", count: 1, names: ["Priya Shah"], reactedByMe: false },
		]);
	});

	it("summarizes replies with up to three distinct reply authors", () => {
		const dto = mapToMessageDto(
			messageRow({
				replies: [
					{ createdAt: at(30), authorUserId: tom.id },
					{ createdAt: at(20), authorUserId: mike.id },
					{ createdAt: at(15), authorUserId: tom.id },
					{ createdAt: at(10), authorUserId: priya.id },
					{ createdAt: at(5), authorUserId: sarah.id },
				],
			}),
			viewer,
			users,
		);
		expect(dto.replyCount).toBe(5);
		expect(dto.lastReplyAt).toBe(at(30).toISOString());
		expect(dto.replyAuthors.map((author) => author.initials)).toEqual([
			"TW",
			"ML",
			"PS",
		]);
	});

	it("lets the author or an admin delete, and hides deleted content", () => {
		const row = messageRow({ reactions: [{ emoji: "🙌", userId: mike.id }] });
		expect(mapToMessageDto(row, viewer, users).canDelete).toBe(true);
		expect(
			mapToMessageDto(row, { userId: priya.id, isAdmin: false }, users)
				.canDelete,
		).toBe(false);
		expect(
			mapToMessageDto(row, { userId: mike.id, isAdmin: true }, users).canDelete,
		).toBe(true);
		expect(
			mapToMessageDto({ ...row, deletedAt: at(9) }, viewer, users),
		).toMatchObject({
			deleted: true,
			canDelete: false,
			text: null,
			reactions: [],
		});
	});

	it("splits attachments into photos and files in order, and none once deleted", () => {
		const row = messageRow({
			attachments: [
				{ id: "upl_first", name: null, size: 2000 },
				{ id: "upl_minutes", name: "Minutes.pdf", size: 5120 },
				{ id: "upl_second", name: null, size: 3000 },
			],
		});
		const dto = mapToMessageDto(row, viewer, users);
		expect(dto.photos).toEqual([
			{
				id: "upl_first",
				url: "/api/v1/chat/attachments/upl_first",
				thumbnailUrl: "/api/v1/chat/attachments/upl_first?size=thumbnail",
			},
			{
				id: "upl_second",
				url: "/api/v1/chat/attachments/upl_second",
				thumbnailUrl: "/api/v1/chat/attachments/upl_second?size=thumbnail",
			},
		]);
		expect(dto.files).toEqual([
			{
				id: "upl_minutes",
				url: "/api/v1/chat/attachments/upl_minutes",
				name: "Minutes.pdf",
				size: 5120,
			},
		]);
		const deleted = mapToMessageDto(
			{ ...row, deletedAt: at(9) },
			viewer,
			users,
		);
		expect(deleted.photos).toEqual([]);
		expect(deleted.files).toEqual([]);
	});

	it("lets only the author edit, and marks an edited message", () => {
		const row = messageRow({ editedAt: at(4) });
		expect(mapToMessageDto(row, viewer, users)).toMatchObject({
			canEdit: true,
			editedAt: at(4).toISOString(),
		});
		expect(
			mapToMessageDto(row, { userId: mike.id, isAdmin: true }, users).canEdit,
		).toBe(false);
		expect(
			mapToMessageDto({ ...row, deletedAt: at(9) }, viewer, users),
		).toMatchObject({ canEdit: false, editedAt: null });
	});
});

describe("collectMessageUserIds", () => {
	it("collects authors from reactions, replies, quotes and forwards", () => {
		const ids = collectMessageUserIds([
			messageRow({
				reactions: [{ emoji: "✅", userId: mike.id }],
				replies: [{ createdAt: at(1), authorUserId: tom.id }],
				quotedMessage: {
					id: "q",
					text: "x",
					gif: null,
					deletedAt: null,
					authorUserId: priya.id,
					attachments: [],
				},
			}),
		]);
		expect(new Set(ids)).toEqual(
			new Set([sarah.id, mike.id, tom.id, priya.id]),
		);
	});
});
