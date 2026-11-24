import { z } from "zod";
import { mapToBoatDto } from "@/domain/boats/common/map-to-boat-dto";
import type { Context } from "@/domain/common/context";
import { paginate } from "@/lib/pagination";
import { SeatTypes, withPagination } from "@/schemas";

export const getBoatsInputSchema = withPagination({
	columns: ["name", "manufacturer", "seats", "rigging"] as const,
}).extend({
	seats: z.enum(SeatTypes).optional(),
});
export type GetBoatsInput = z.infer<typeof getBoatsInputSchema>;

export async function getBoatsQuery(input: GetBoatsInput, { db }: Context) {
	const { page, pageSize = 20, sortBy, order, seats } = input;

	const where = seats ? { seats } : {};

	const [boats, totalCount] = await Promise.all([
		db.boat.findMany({
			where,
			orderBy: { [sortBy ?? "id"]: order ?? "asc" },
			take: pageSize,
			skip: ((page ?? 1) - 1) * pageSize,
		}),
		db.boat.count({ where }),
	]);

	const metersAgg = await db.activity.groupBy({
		by: ["boatId"],
		where: { type: "water", boatId: { in: boats.map((boat) => boat.id) } },
		_sum: { distance: true },
	});

	const metersMap = new Map(
		metersAgg
			.filter((r): r is typeof r & { boatId: string } => r.boatId != null)
			.map((r) => [r.boatId, r._sum.distance ?? 0]),
	);

	const data = boats.map((boat) =>
		mapToBoatDto({ boat, meters: metersMap.get(boat.id) ?? 0 }),
	);

	return paginate({ data, totalCount, page, pageSize });
}
