import { getMembersInputSchema } from "@/schemas/chat.schema";
import { getMembersQuery } from "@/server/domain/chat/queries/get-members/get-members.query";
import { viewerProcedure } from "@/server/infra/trpc/procedures/viewer.procedure";

export const getMembersProcedure = viewerProcedure
	.input(getMembersInputSchema)
	.query(({ input, ctx }) => getMembersQuery(input, ctx));
