import { getMembersQuery } from "@/domain/chat/queries/get-members/get-members.query";
import { getMembersInputSchema } from "@/schemas/chat.schema";
import { viewerProcedure } from "@/trpc/procedures/viewer.procedure";

export const getMembersProcedure = viewerProcedure
	.input(getMembersInputSchema)
	.query(({ input, ctx }) => getMembersQuery(input, ctx));
