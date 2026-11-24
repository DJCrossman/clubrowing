import { getChannelsQuery } from "@/domain/chat/queries/get-channels/get-channels.query";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const getChannelsProcedure = viewerProcedure.query(({ ctx }) =>
	getChannelsQuery(undefined, ctx),
);
