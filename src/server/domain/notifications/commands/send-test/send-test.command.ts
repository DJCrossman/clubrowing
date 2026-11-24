import type { AuthenticatedContext } from "@/domain/common/context";
import { DomainError } from "@/domain/common/domain-error";
import { routes } from "@/lib/routes";

export async function sendTestCommand(
	_input: undefined,
	{ athlete, services }: AuthenticatedContext,
) {
	if (!services.push.isConfigured) {
		throw new DomainError(
			"PRECONDITION_FAILED",
			"Push notifications are not configured on the server.",
		);
	}

	return services.push.sendPush([athlete.id], {
		title: "Notifications are on",
		body: "You'll hear about practice changes, regatta updates and messages from your groups.",
		url: routes.settings.notifications(),
		tag: "test",
	});
}
