import { describe, expect, it, vi } from "vitest";
import type { ViewerContext } from "@/server/domain/common/context";
import { getConcept2AccessTokenForAthlete } from "@/server/routers/activities/common/get-concept2-access-token-for-athlete";
import { getActivityStrokesQuery } from "./get-activity-strokes.query";

vi.mock(
	"@/server/routers/activities/common/get-concept2-access-token-for-athlete",
	() => ({ getConcept2AccessTokenForAthlete: vi.fn(async () => "token") }),
);

const strokes = [
	{ t: 0, d: 0, p: 1180, spm: 0, hr: 0 },
	{ t: 25, d: 107, p: 1172, spm: 24, hr: 131 },
];

describe("getActivityStrokesQuery", () => {
	it("returns stored strokes without calling Concept2", async () => {
		const { db, services, ctx } = createContext({
			strokes: { strokes },
		});

		const result = await getActivityStrokesQuery({ id: "act_1" }, ctx);

		expect(result).toEqual(strokes);
		expect(services.concept2.fetchStrokes).not.toHaveBeenCalled();
		expect(db.activity_strokes.upsert).not.toHaveBeenCalled();
	});

	it("fetches, stores and returns strokes when none are stored", async () => {
		const { db, services, ctx } = createContext({});

		const result = await getActivityStrokesQuery({ id: "act_1" }, ctx);

		expect(result).toEqual(strokes);
		expect(services.concept2.fetchStrokes).toHaveBeenCalledWith(
			"token",
			BigInt(900_001),
		);
		expect(db.activity_strokes.upsert).toHaveBeenCalledWith({
			where: { activityId: "act_1" },
			create: { activityId: "act_1", strokes },
			update: {},
		});
	});

	it("returns null without calling Concept2 when the result has no stroke data", async () => {
		const { services, ctx } = createContext({
			conceptTwoData: { stroke_data: false },
		});

		const result = await getActivityStrokesQuery({ id: "act_1" }, ctx);

		expect(result).toBeNull();
		expect(services.concept2.fetchStrokes).not.toHaveBeenCalled();
	});

	it("returns null and stores nothing without a Concept2 token", async () => {
		vi.mocked(getConcept2AccessTokenForAthlete).mockResolvedValueOnce(null);
		const { db, services, ctx } = createContext({});

		const result = await getActivityStrokesQuery({ id: "act_1" }, ctx);

		expect(result).toBeNull();
		expect(services.concept2.fetchStrokes).not.toHaveBeenCalled();
		expect(db.activity_strokes.upsert).not.toHaveBeenCalled();
	});

	it("refuses another athlete's activity", async () => {
		const { ctx } = createContext({ athleteId: "ath_other" });

		await expect(
			getActivityStrokesQuery({ id: "act_1" }, ctx),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	it("lets an admin read another athlete's activity", async () => {
		const { ctx } = createContext({
			athleteId: "ath_other",
			strokes: { strokes },
			isAdmin: true,
		});

		const result = await getActivityStrokesQuery({ id: "act_1" }, ctx);

		expect(result).toEqual(strokes);
	});

	it("refuses an admin another athlete's hidden activity", async () => {
		const { ctx } = createContext({
			athleteId: "ath_other",
			isHidden: true,
			strokes: { strokes },
			isAdmin: true,
		});

		await expect(
			getActivityStrokesQuery({ id: "act_1" }, ctx),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});
});

function createContext({
	athleteId = "ath_me",
	isHidden = false,
	conceptTwoData = { stroke_data: true },
	strokes: stored = null,
	isAdmin = false,
}: {
	athleteId?: string;
	isHidden?: boolean;
	conceptTwoData?: unknown;
	strokes?: { strokes: unknown } | null;
	isAdmin?: boolean;
}) {
	const db = {
		activity: {
			findUnique: vi.fn(async () => ({
				id: "act_1",
				athleteId,
				isHidden,
				conceptTwoId: BigInt(900_001),
				conceptTwoData,
				strokes: stored,
			})),
		},
		activity_strokes: { upsert: vi.fn(async () => ({})) },
	};
	const services = {
		concept2: { fetchStrokes: vi.fn(async () => strokes) },
	};
	return {
		db,
		services,
		ctx: {
			db,
			services,
			user: { isAdmin },
			athlete: { id: "ath_me" },
		} as unknown as ViewerContext,
	};
}
