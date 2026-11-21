export type MentionRange = { userId: string; start: number; length: number };

type Stretch = { start: number; length: number };

type MentionTextPart<T extends Stretch> =
	| { kind: "text"; value: string }
	| { kind: "mention"; value: string; mention: T };

const MAX_MENTION_QUERY_LENGTH = 40;

export function getMentionQuery({
	text,
	caret,
}: {
	text: string;
	caret: number;
}): { start: number; query: string } | null {
	if (caret < 1) return null;
	const start = text.lastIndexOf("@", caret - 1);
	if (start === -1) return null;
	if (start > 0 && !/\s/.test(text[start - 1])) return null;
	const query = text.slice(start + 1, caret);
	if (query.includes("\n")) return null;
	if (query.length > MAX_MENTION_QUERY_LENGTH) return null;
	return { start, query };
}

export function locateMentions({
	text,
	picked,
}: {
	text: string;
	picked: { userId: string; label: string }[];
}): MentionRange[] {
	const userIdByLabel = new Map(
		picked.map(({ userId, label }) => [label, userId]),
	);
	const longestFirst = [...userIdByLabel]
		.filter(([label]) => label.length >= 2)
		.sort(([a], [b]) => b.length - a.length);
	const mentions: MentionRange[] = [];
	for (const [label, userId] of longestFirst) {
		for (
			let start = text.indexOf(label);
			start !== -1;
			start = text.indexOf(label, start + 1)
		) {
			const end = start + label.length;
			const isWholeWord =
				!/[\p{L}\p{N}]$/u.test(text.slice(0, start)) &&
				!/^[\p{L}\p{N}]/u.test(text.slice(end));
			const overlaps = mentions.some(
				(mention) =>
					start < mention.start + mention.length && mention.start < end,
			);
			if (isWholeWord && !overlaps) {
				mentions.push({ userId, start, length: label.length });
			}
		}
	}
	return mentions.sort((a, b) => a.start - b.start);
}

export function mentionsFitText({
	text,
	mentions,
}: {
	text: string;
	mentions: Stretch[];
}): boolean {
	let previousEnd = 0;
	for (const { start, length } of mentions) {
		if (start < previousEnd || length < 2) return false;
		if (start + length > text.length || text[start] !== "@") return false;
		previousEnd = start + length;
	}
	return true;
}

export function splitTextByMentions<T extends Stretch>({
	text,
	mentions,
}: {
	text: string;
	mentions: T[];
}): MentionTextPart<T>[] {
	if (!mentionsFitText({ text, mentions })) {
		return [{ kind: "text", value: text }];
	}
	const parts: MentionTextPart<T>[] = [];
	let cursor = 0;
	for (const mention of mentions) {
		if (mention.start > cursor) {
			parts.push({ kind: "text", value: text.slice(cursor, mention.start) });
		}
		const end = mention.start + mention.length;
		parts.push({
			kind: "mention",
			value: text.slice(mention.start, end),
			mention,
		});
		cursor = end;
	}
	if (cursor < text.length) {
		parts.push({ kind: "text", value: text.slice(cursor) });
	}
	return parts;
}
