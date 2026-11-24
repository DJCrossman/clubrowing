import { getChannelsQuery } from "@/server/domain/chat/queries/get-channels/get-channels.query";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const getChannelsProcedure = viewerProcedure.query(({ ctx }) =>
	getChannelsQuery(undefined, ctx),
);
