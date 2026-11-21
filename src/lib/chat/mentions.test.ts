import { describe, expect, it } from "vitest";
import {
	getMentionQuery,
	locateMentions,
	mentionsFitText,
	splitTextByMentions,
} from "./mentions";

describe("getMentionQuery", () => {
	it("finds the name being typed after an @ that starts a word", () => {
		expect(getMentionQuery({ text: "hi @av", caret: 6 })).toEqual({
			start: 3,
			query: "av",
		});
	});

	it("offers everyone right after a lone @", () => {
		expect(getMentionQuery({ text: "@", caret: 1 })).toEqual({
			start: 0,
			query: "",
		});
	});

	it("keeps a space in the query so a full name can be typed", () => {
		expect(getMentionQuery({ text: "@morgan oa", caret: 10 })).toEqual({
			start: 0,
			query: "morgan oa",
		});
	});

	it("ignores an @ inside a word, such as an email address", () => {
		expect(getMentionQuery({ text: "a@b", caret: 3 })).toBeNull();
	});

	it("ignores a caret before the @", () => {
		expect(getMentionQuery({ text: "hi @av", caret: 2 })).toBeNull();
	});

	it("stops at a new line and after 40 characters", () => {
		expect(getMentionQuery({ text: "@av\nok", caret: 6 })).toBeNull();
		const long = `@${"a".repeat(41)}`;
		expect(getMentionQuery({ text: long, caret: long.length })).toBeNull();
	});
});

describe("locateMentions", () => {
	it("finds every picked label still in the text, in order", () => {
		expect(
			locateMentions({
				text: "@Morgan Oarsby and @Avery Coxwell, then @Morgan Oarsby again",
				picked: [
					{ userId: "user_avery", label: "@Avery Coxwell" },
					{ userId: "user_morgan", label: "@Morgan Oarsby" },
				],
			}),
		).toEqual([
			{ userId: "user_morgan", start: 0, length: 14 },
			{ userId: "user_avery", start: 19, length: 14 },
			{ userId: "user_morgan", start: 40, length: 14 },
		]);
	});

	it("does not match a label inside a longer name", () => {
		expect(
			locateMentions({
				text: "@Sam Leeson",
				picked: [{ userId: "user_sam", label: "@Sam Lee" }],
			}),
		).toEqual([]);
	});

	it("lets the longer label claim its stretch first", () => {
		expect(
			locateMentions({
				text: "@Sam Lee Jr. and @Sam Lee",
				picked: [
					{ userId: "user_sam", label: "@Sam Lee" },
					{ userId: "user_junior", label: "@Sam Lee Jr" },
				],
			}),
		).toEqual([
			{ userId: "user_junior", start: 0, length: 11 },
			{ userId: "user_sam", start: 17, length: 8 },
		]);
	});

	it("gives a shared label to the person picked last", () => {
		expect(
			locateMentions({
				text: "hi @Alex Kim",
				picked: [
					{ userId: "user_first", label: "@Alex Kim" },
					{ userId: "user_second", label: "@Alex Kim" },
				],
			}),
		).toEqual([{ userId: "user_second", start: 3, length: 9 }]);
	});

	it("drops a label that was edited away", () => {
		expect(
			locateMentions({
				text: "hi @Morg",
				picked: [{ userId: "user_morgan", label: "@Morgan Oarsby" }],
			}),
		).toEqual([]);
	});

	it("counts UTF-16 offsets after an emoji", () => {
		const text = "🚣 @Morgan Oarsby";
		const [mention] = locateMentions({
			text,
			picked: [{ userId: "user_morgan", label: "@Morgan Oarsby" }],
		});
		expect(mention.start).toBe(3);
		expect(text.slice(mention.start, mention.start + mention.length)).toBe(
			"@Morgan Oarsby",
		);
	});
});

describe("mentionsFitText", () => {
	it("accepts an empty list and ranges that start on an @ in order", () => {
		expect(mentionsFitText({ text: "hi", mentions: [] })).toBe(true);
		expect(
			mentionsFitText({
				text: "@Al @Bo",
				mentions: [
					{ start: 0, length: 3 },
					{ start: 4, length: 3 },
				],
			}),
		).toBe(true);
	});

	it("rejects ranges past the end, off an @, too short, overlapping or out of order", () => {
		const text = "@Al @Bo";
		expect(mentionsFitText({ text, mentions: [{ start: 4, length: 4 }] })).toBe(
			false,
		);
		expect(mentionsFitText({ text, mentions: [{ start: 1, length: 2 }] })).toBe(
			false,
		);
		expect(mentionsFitText({ text, mentions: [{ start: 0, length: 1 }] })).toBe(
			false,
		);
		expect(
			mentionsFitText({
				text,
				mentions: [
					{ start: 0, length: 5 },
					{ start: 4, length: 3 },
				],
			}),
		).toBe(false);
		expect(
			mentionsFitText({
				text,
				mentions: [
					{ start: 4, length: 3 },
					{ start: 0, length: 3 },
				],
			}),
		).toBe(false);
	});
});

describe("splitTextByMentions", () => {
	it("splits the text into plain stretches and mentions as typed", () => {
		const morgan = { userId: "user_morgan", start: 3, length: 14 };
		expect(
			splitTextByMentions({
				text: "🚣 @Morgan Oarsby, nice piece",
				mentions: [morgan],
			}),
		).toEqual([
			{ kind: "text", value: "🚣 " },
			{ kind: "mention", value: "@Morgan Oarsby", mention: morgan },
			{ kind: "text", value: ", nice piece" },
		]);
	});

	it("shows the whole text plainly when a mention no longer fits", () => {
		expect(
			splitTextByMentions({
				text: "hi there",
				mentions: [{ userId: "user_morgan", start: 3, length: 14 }],
			}),
		).toEqual([{ kind: "text", value: "hi there" }]);
	});
});
