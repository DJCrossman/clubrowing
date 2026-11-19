import { describe, expect, it } from "vitest";
import { concept2ActivitySchema } from "./concept2Activity.schema";

const result = {
	id: 1234,
	user_id: 5678,
	date: "2026-09-20 18:36:00",
	timezone: "America/Regina",
	date_utc: "2026-09-21 00:36:00",
	distance: 5000,
	type: "rower",
	time: 12000,
	time_formatted: "20:00.0",
	workout_type: "FixedDistanceInterval",
	source: "ErgData",
	weight_class: "H",
	verified: false,
	ranked: false,
	comments: null,
	privacy: "private",
	stroke_data: true,
	real_time: 12500,
	heart_rate: { average: 150, ending: 160, zone: 3 },
	workout: {
		targets: { stroke_rate: 24 },
		intervals: [
			{
				type: "distance",
				time: 600,
				distance: 500,
				calories_total: 30,
				stroke_rate: 24,
				rest_distance: 20,
				heart_rate: { min: 90, max: 170, rest: 120 },
				machine: "rower",
			},
		],
		splits: [{ type: "distance", time: 300, distance: 250 }],
	},
};

describe("concept2ActivitySchema", () => {
	it("keeps fields the schema does not declare, at every level", () => {
		const parsed = concept2ActivitySchema.parse(result);
		expect(parsed).toEqual(result);
	});

	it("accepts interval heart rate without average or ending", () => {
		const parsed = concept2ActivitySchema.safeParse(result);
		expect(parsed.success).toBe(true);
	});

	it("keeps only the monitor's serial and firmware from the metadata", () => {
		const parsed = concept2ActivitySchema.parse({
			...result,
			metadata: {
				data: {
					serial_number: "430123456",
					firmware_version: "7.10",
					pm_version: "PM5v3",
					device: "iPhone",
					device_os: "iOS",
					device_os_version: "18.1",
				},
			},
		});
		expect(parsed.metadata).toEqual({
			data: { serial_number: "430123456", firmware_version: "7.10" },
		});
	});

	it("reads an unexpected metadata shape as no metadata", () => {
		const parsed = concept2ActivitySchema.safeParse({
			...result,
			metadata: [{ serial_number: 430123456 }],
		});
		expect(parsed.success).toBe(true);
		expect(parsed.data?.metadata).toBeUndefined();
	});
});
