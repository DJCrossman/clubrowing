import { DateTime } from "luxon";

export function isOldEnoughForGifs(dateOfBirth: string) {
	// A date of birth is stored as midnight UTC, so read it in UTC to keep the calendar day.
	const thirteenthBirthday = DateTime.fromISO(dateOfBirth, { zone: "utc" })
		.plus({ years: 13 })
		.toISODate();
	return (
		thirteenthBirthday !== null &&
		DateTime.now().toISODate() >= thirteenthBirthday
	);
}
