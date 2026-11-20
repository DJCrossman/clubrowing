import { describe, expect, it } from "vitest";
import { getAttachmentsPreview } from "./attachments";

describe("getAttachmentsPreview", () => {
	it("says nothing for a message without attachments", () => {
		expect(
			getAttachmentsPreview({ photoCount: 0, fileCount: 0, fileName: null }),
		).toBeNull();
	});

	it("names a single photo and counts several", () => {
		expect(
			getAttachmentsPreview({ photoCount: 1, fileCount: 0, fileName: null }),
		).toBe("Photo");
		expect(
			getAttachmentsPreview({ photoCount: 3, fileCount: 0, fileName: null }),
		).toBe("3 photos");
	});

	it("names a single file", () => {
		expect(
			getAttachmentsPreview({
				photoCount: 0,
				fileCount: 1,
				fileName: "race-plan.pdf",
			}),
		).toBe("File: race-plan.pdf");
	});

	it("counts photos and files together once there is a file among several", () => {
		expect(
			getAttachmentsPreview({
				photoCount: 2,
				fileCount: 1,
				fileName: "race-plan.pdf",
			}),
		).toBe("3 files");
		expect(
			getAttachmentsPreview({
				photoCount: 0,
				fileCount: 2,
				fileName: "race-plan.pdf",
			}),
		).toBe("2 files");
	});
});
