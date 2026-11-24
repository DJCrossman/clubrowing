import { viewerProcedure } from "@/server/procedures";
import { getActivitiesMemberQuery } from "./get-activities.member.query";
import { getActivitiesInputSchema } from "./get-activities.query";

export const getActivitiesProcedure = viewerProcedure
	.input(getActivitiesInputSchema.optional())
	.query(({ ctx, input = {} }) => getActivitiesMemberQuery(input, ctx));
