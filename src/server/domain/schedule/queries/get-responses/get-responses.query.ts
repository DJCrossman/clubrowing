import {
	EVENT_TYPE_LABELS,
	formatEventDate,
	formatEventTime,
	formatGroupLabel,
} from "@/lib/schedule/event-labels";
import type { EventIdInput } from "@/schemas";
import {
	type AthleteRow,
	athleteInclude,
	mapToAthleteDto,
} from "@/server/domain/athletes/common/map-to-athlete-dto";
import type { ViewerContext } from "@/server/domain/common/context";
import { DomainError } from "@/server/domain/common/domain-error";
import { canSeeGroup, getViewerGroups } from "@/server/domain/groups/common";
import { countResponses } from "@/server/domain/schedule/common/count-responses";
import { getEventAudiences } from "@/server/domain/schedule/common/event-audience";
import {
	eventInclude,
	findGroupNames,
} from "@/server/domain/schedule/common/map-to-event-dto";

export async function getResponsesQuery(
	{ eventId }: EventIdInput,
	ctx: ViewerContext,
) {
	const { db, athlete } = ctx;
	const [event, viewer] = await Promise.all([
		db.event.findUnique({
			where: { id: eventId },
			include: eventInclude,
		}),
		getViewerGroups(ctx),
	]);
	if (!event) {
		throw new DomainError("NOT_FOUND", "Event not found");
	}
	const audienceIds = (await getEventAudiences(db, [event])).get(event.id);
	const audience: ReadonlySet<string> = audienceIds ?? new Set();
	if (!viewer.isAdmin && !(athlete && audience.has(athlete.id))) {
		throw new DomainError("NOT_FOUND", "Event not found");
	}
	const statusByAthlete = new Map(
		event.rsvps.map(({ athleteId, status }) => [athleteId, status]),
	);
	const groupIds = event.groups
		.map(({ groupId }) => groupId)
		.filter((groupId) => canSeeGroup(viewer, groupId));
	const [athletes, groupNames] = await Promise.all([
		db.athlete.findMany({
			where: {
				id: { in: [...new Set([...audience, ...statusByAthlete.keys()])] },
			},
			include: athleteInclude,
			orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
		}),
		findGroupNames(db, groupIds),
	]);
	const people = athletes.map(mapToResponsePerson);

	return {
		event: {
			id: event.id,
			title: event.title,
			typeLabel: EVENT_TYPE_LABELS[event.type],
			dateLabel: formatEventDate(event.startAt, event.timezone),
			timeLabel: formatEventTime(event),
			groupLabel: formatGroupLabel(event.audience, groupIds, groupNames),
		},
		counts: countResponses(event.rsvps, audience),
		going: people.filter((p) => statusByAthlete.get(p.athleteId) === "yes"),
		maybe: people.filter((p) => statusByAthlete.get(p.athleteId) === "maybe"),
		no: people.filter((p) => statusByAthlete.get(p.athleteId) === "no"),
		noReply: people.filter(
			(p) => !statusByAthlete.has(p.athleteId) && audience.has(p.athleteId),
		),
	};
}

function mapToResponsePerson(row: AthleteRow) {
	const athlete = mapToAthleteDto(row);
	return {
		athleteId: athlete.id,
		name: `${athlete.name} ${athlete.lastName}`,
		initials:
			`${athlete.name.charAt(0)}${athlete.lastName.charAt(0)}`.toUpperCase(),
		program: athlete.activeMembership?.name ?? null,
	};
}
