import { sendTestCommand } from "@/server/domain/notifications/commands/send-test/send-test.command";
import { protectedProcedure } from "@/server/infra/trpc/procedures/protected.procedure";

export const sendTestProcedure = protectedProcedure.mutation(({ ctx }) =>
	sendTestCommand(undefined, ctx),
);
