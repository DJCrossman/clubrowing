import { afterEach, describe, expect, it, vi } from "vitest";
import { isOldEnoughForGifs } from "./gifs";

describe("isOldEnoughForGifs", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("waits until the day of the 13th birthday", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 10, 19, 12));
		expect(isOldEnoughForGifs("2013-11-20T00:00:00.000Z")).toBe(false);
		vi.setSystemTime(new Date(2026, 10, 20, 12));
		expect(isOldEnoughForGifs("2013-11-20T00:00:00.000Z")).toBe(true);
	});

	it("lets in an admin without a member profile, who is born in 1970", () => {
		expect(isOldEnoughForGifs(new Date(0).toISOString())).toBe(true);
	});
});
