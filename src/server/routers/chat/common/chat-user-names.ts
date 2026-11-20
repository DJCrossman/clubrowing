export type ChatUser = {
	id: string;
	name: string;
	initials: string;
};

type NamedPerson = {
	firstName: string | null;
	lastName: string | null;
	nickname?: string | null;
};

export function getChatUser(users: Map<string, ChatUser>, userId: string) {
	return (
		users.get(userId) ?? {
			id: userId,
			name: "Former member",
			initials: "?",
		}
	);
}

export function toChatUser(userId: string, person: NamedPerson): ChatUser {
	return {
		id: userId,
		name: getDisplayName(person),
		initials: getInitials(person),
	};
}

export function getDisplayName(person: NamedPerson) {
	const name = [person.nickname || person.firstName, person.lastName]
		.filter(Boolean)
		.join(" ");
	return name || "Club member";
}

export function getInitials(person: NamedPerson) {
	const initials = [person.nickname || person.firstName, person.lastName]
		.map((part) => part?.charAt(0) ?? "")
		.join("")
		.toUpperCase();
	return initials || "?";
}
