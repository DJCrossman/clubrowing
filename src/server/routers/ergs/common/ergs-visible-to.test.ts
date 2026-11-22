import { describe, expect, it } from "vitest";
import type { ContextAthlete } from "@/server/context";
import { ergsVisibleTo } from "./ergs-visible-to";

const athlete: ContextAthlete = {
	id: "ath_me",
	userId: "user_me",
	firstName: "Morgan",
	lastName: "Oarsby",
	nickname: null,
	phone: "+13065550100",
	email: "morgan@example.com",
	role: "member",
	gender: "female",
	dateOfBirth: new Date("1990-05-04"),
	dateJoined: null,
	heightInCm: null,
	weightInKg: null,
	concept2UserId: null,
	concept2AccessToken: null,
	concept2RefreshToken: null,
	concept2TokenExpiresAt: null,
	concept2ConnectedAt: null,
	rcaUsername: null,
	rcaPassword: null,
	rcaConnectedAt: null,
	stravaAthleteId: null,
	stravaAccessToken: null,
	stravaRefreshToken: null,
	stravaTokenExpiresAt: null,
	stravaAthleteJson: null,
	stravaConnectedAt: null,
	createdAt: new Date("2024-03-01"),
	updatedAt: new Date("2024-03-01"),
	memberships: [],
};

describe("ergsVisibleTo", () => {
	it("shows an admin every erg", () => {
		expect(
			ergsVisibleTo({ user: { id: "user_admin", isAdmin: true }, athlete }),
		).toEqual({});
	});

	it("shows a member the club ergs and their own personal erg", () => {
		expect(
			ergsVisibleTo({ user: { id: "user_me", isAdmin: false }, athlete }),
		).toEqual({
			OR: [{ ownership: "club" }, { ownership: "personal", ownerId: "ath_me" }],
		});
	});

	it("shows a member without an athlete row only the club ergs", () => {
		expect(
			ergsVisibleTo({ user: { id: "user_me", isAdmin: false }, athlete: null }),
		).toEqual({ ownership: "club" });
	});
});
