import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";
import { getChannelsQuery } from "./get-channels.query";

export const getChannelsProcedure = viewerProcedure.query(({ ctx }) =>
	getChannelsQuery(undefined, ctx),
);
