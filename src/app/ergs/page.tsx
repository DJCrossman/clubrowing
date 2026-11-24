import { z } from "zod";
import { ErgListScene } from "@/scenes/ergs";
import { createServerCaller } from "@/trpc/caller";
import { createRequestContext } from "@/trpc/request-context";

const querySchema = z.object({
	ergId: z.string().optional(),
	action: z.literal("create").optional(),
});

export default async function ErgsPage({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const { ergId, action } = querySchema.parse(await searchParams);
	const caller = await createServerCaller();
	const { user } = await createRequestContext();
	const [ergsResponse, { data: activities }, selectedErg, { data: athletes }] =
		await Promise.all([
			caller.ergs.getErgs(),
			ergId
				? caller.activities.getActivities({ ergId })
				: Promise.resolve({ data: [] }),
			ergId ? caller.ergs.getErgById({ id: ergId }) : null,
			user?.isAdmin
				? caller.athletes.getAthletes({ pageSize: 200 })
				: Promise.resolve({ data: undefined }),
		]);

	return (
		<ErgListScene
			initialData={ergsResponse}
			selectedErg={selectedErg}
			activities={activities}
			athletes={athletes}
			isCreateDrawerOpen={action === "create"}
		/>
	);
}
