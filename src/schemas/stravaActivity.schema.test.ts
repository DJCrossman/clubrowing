import { describe, expect, it } from "vitest";
import { stravaActivitySchema } from "./stravaActivity.schema";

const activity = {
	id: 123,
	resource_state: 2,
	athlete: { id: 456, resource_state: 1 },
	name: "Morning Row",
	distance: 8000,
	moving_time: 2100,
	elapsed_time: 2200,
	total_elevation_gain: 0,
	type: "Rowing",
	sport_type: "Rowing",
	start_date: "2026-11-01T13:00:00Z",
	start_date_local: "2026-11-01T07:00:00Z",
	timezone: "(GMT-06:00) America/Regina",
	utc_offset: -21600,
	achievement_count: 0,
	kudos_count: 0,
	comment_count: 0,
	athlete_count: 1,
	photo_count: 0,
	map: { id: "a123", resource_state: 2 },
	trainer: false,
	commute: false,
	manual: false,
	private: false,
	visibility: "everyone",
	flagged: false,
	average_speed: 3.6,
	max_speed: 4.2,
};

describe("stravaActivitySchema", () => {
	it("accepts manual activities, which have no upload", () => {
		const { external_id, upload_id } = stravaActivitySchema.in.shape;
		expect(external_id.safeParse(null).success).toBe(true);
		expect(upload_id.safeParse(null).success).toBe(true);
	});

	it("keeps the exact id from id_str when id is too large for a double", () => {
		// 9007199254740993 read as a JSON number rounds to 2 ** 53.
		const parsed = stravaActivitySchema.parse({
			...activity,
			id: 2 ** 53,
			id_str: "9007199254740993",
		});
		expect(parsed.id_str).toBe("9007199254740993");
	});

	it("takes id_str from id for a payload stored before id_str was kept", () => {
		expect(stravaActivitySchema.parse(activity).id_str).toBe("123");
	});

	it("rejects a payload without id_str whose id is too large for a double", () => {
		expect(
			stravaActivitySchema.safeParse({ ...activity, id: 2 ** 53 }).success,
		).toBe(false);
	});
});
