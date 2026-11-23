import { describe, expect, it } from "vitest";
import { buildActivityAddedMessage } from "./activity-notifications";

const activity = {
	id: "act_1",
	athleteId: "ath_1",
	name: "Morning row",
	distance: 2000,
	elapsedTime: 420000,
};

describe("buildActivityAddedMessage", () => {
	it("names the activity with its distance", () => {
		const { body } = buildActivityAddedMessage(activity);
		expect(body).toContain("Morning row");
		expect(body).toContain("2,000");
	});

	it("leaves out the distance when the activity has none", () => {
		const { body } = buildActivityAddedMessage({ ...activity, distance: 0 });
		expect(body).toContain("Morning row");
		expect(body).toContain("07:00.0");
		expect(body).not.toContain("0 m");
	});

	it("opens that activity", () => {
		expect(buildActivityAddedMessage(activity).url).toBe(
			"/activities?activityId=act_1",
		);
	});

	it("respects the activities preference", () => {
		expect(buildActivityAddedMessage(activity).scope).toBe("activities");
	});

	it("replaces an earlier arrival on the device", () => {
		expect(buildActivityAddedMessage(activity).tag).toBe(
			buildActivityAddedMessage({ ...activity, id: "act_2" }).tag,
		);
	});
});
