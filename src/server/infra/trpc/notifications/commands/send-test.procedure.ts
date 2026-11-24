import { sendTestCommand } from "@/domain/notifications/commands/send-test/send-test.command";
import { protectedProcedure } from "@/trpc/procedures/protected.procedure";

export const sendTestProcedure = protectedProcedure.mutation(({ ctx }) =>
	sendTestCommand(undefined, ctx),
);
