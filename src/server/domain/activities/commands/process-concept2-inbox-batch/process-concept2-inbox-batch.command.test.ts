import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedContext } from "@/server/domain/common/context";
import { processConcept2InboxBatchCommand } from "./process-concept2-inbox-batch.command";

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
	workout_type: "FixedDistanceSplits",
	source: "ErgData",
	weight_class: "H",
	verified: false,
	ranked: false,
};

const metadata = {
	data: { serial_number: "430123456", firmware_version: "7.10" },
};

describe("processConcept2InboxBatchCommand", () => {
	it("links a result to the erg that already has its monitor's serial", async () => {
		const { context, tx } = createContext({
			payload: [{ ...result, metadata }],
			knownErg: { id: "erg_1" },
		});

		await processConcept2InboxBatchCommand({ batchId: "inbox_1" }, context);

		expect(tx.erg.findFirst).toHaveBeenCalledWith({
			where: { serialNumber: "430123456" },
			select: { id: true },
		});
		expect(tx.erg.create).not.toHaveBeenCalled();
		expect(tx.activity.create.mock.calls[0][0].data.erg).toEqual({
			connect: { id: "erg_1" },
		});
	});

	it("creates the erg the first time a monitor's serial is seen", async () => {
		const { context, tx } = createContext({
			payload: [{ ...result, metadata }],
			knownErg: null,
		});

		await processConcept2InboxBatchCommand({ batchId: "inbox_1" }, context);

		expect(tx.erg.create).toHaveBeenCalledWith({
			data: {
				name: "Erg 430123456",
				manufacturer: "concept2",
				serialNumber: "430123456",
				firmwareVersion: "7.10",
			},
			select: { id: true },
		});
		expect(tx.activity.create.mock.calls[0][0].data.erg).toEqual({
			connect: { id: "erg_new" },
		});
	});

	it("links the erg when a result that is already stored comes in again", async () => {
		const { context, tx } = createContext({
			payload: [{ ...result, metadata }],
			knownErg: { id: "erg_1" },
		});
		tx.activity.findMany.mockResolvedValueOnce([
			{ id: "act_1", stravaId: null, conceptTwoId: BigInt(result.id) },
		]);

		await processConcept2InboxBatchCommand({ batchId: "inbox_1" }, context);

		expect(tx.activity.create).not.toHaveBeenCalled();
		expect(tx.activity.update.mock.calls[0][0].data.erg).toEqual({
			connect: { id: "erg_1" },
		});
	});

	it("links no erg to an on-water result", async () => {
		const { context, tx } = createContext({
			payload: [{ ...result, type: "water", metadata }],
			knownErg: { id: "erg_1" },
		});

		await processConcept2InboxBatchCommand({ batchId: "inbox_1" }, context);

		expect(tx.erg.findFirst).not.toHaveBeenCalled();
		expect(tx.activity.create.mock.calls[0][0].data).not.toHaveProperty("erg");
	});

	it("links no erg when the result carries no metadata", async () => {
		const { context, tx } = createContext({
			payload: [result],
			knownErg: { id: "erg_1" },
		});

		await processConcept2InboxBatchCommand({ batchId: "inbox_1" }, context);

		expect(tx.erg.findFirst).not.toHaveBeenCalled();
		expect(tx.activity.create.mock.calls[0][0].data).not.toHaveProperty("erg");
	});

	it("attaches a new result to the workout scheduled when it was rowed", async () => {
		const { context, tx } = createContext({
			payload: [result],
			knownErg: null,
		});
		tx.event.findMany.mockResolvedValueOnce([
			{
				workoutId: "work_1",
				startAt: new Date("2026-09-21T00:00:00Z"),
				audience: "club",
				groups: [],
			},
		]);

		await processConcept2InboxBatchCommand({ batchId: "inbox_1" }, context);

		expect(tx.activity.create.mock.calls[0][0].data.workout).toEqual({
			connect: { id: "work_1" },
		});
	});

	it("leaves the workout of a result that is already stored alone", async () => {
		const { context, tx } = createContext({
			payload: [result],
			knownErg: null,
		});
		tx.activity.findMany.mockResolvedValueOnce([
			{ id: "act_1", stravaId: null, conceptTwoId: BigInt(result.id) },
		]);

		await processConcept2InboxBatchCommand({ batchId: "inbox_1" }, context);

		expect(tx.event.findMany).not.toHaveBeenCalled();
		expect(tx.activity.update.mock.calls[0][0].data).not.toHaveProperty(
			"workout",
		);
		expect(tx.activity.update.mock.calls[0][0].data).not.toHaveProperty(
			"workoutId",
		);
	});
});

function createContext({
	payload,
	knownErg,
}: {
	payload: unknown[];
	knownErg: { id: string } | null;
}) {
	const tx = {
		$executeRaw: vi.fn(async () => 1),
		activity: {
			findMany: vi.fn(async (): Promise<unknown[]> => []),
			// biome-ignore lint/suspicious/noExplicitAny: recorded Prisma args
			create: vi.fn(async (_args: any) => ({ id: "act_new" })),
			// biome-ignore lint/suspicious/noExplicitAny: recorded Prisma args
			update: vi.fn(async (_args: any) => ({ id: "act_1" })),
		},
		erg: {
			findFirst: vi.fn(async () => knownErg),
			create: vi.fn(async () => ({ id: "erg_new" })),
		},
		event: { findMany: vi.fn(async (): Promise<unknown[]> => []) },
		activity_inbox: { update: vi.fn(async () => ({})) },
	};
	const context = {
		db: {
			activity_inbox: {
				updateMany: vi.fn(async () => ({ count: 1 })),
				findUniqueOrThrow: vi.fn(async () => ({
					id: "inbox_1",
					athleteId: "ath_1",
					payload,
				})),
			},
			$transaction: async (fn: (client: typeof tx) => Promise<unknown>) =>
				fn(tx),
		},
	} as unknown as Pick<AuthenticatedContext, "db">;

	return { context, tx };
}
