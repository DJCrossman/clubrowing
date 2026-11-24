import { attachActivityScreenshotProcedure } from "@/server/infra/trpc/activities/commands/attach-activity-screenshot.procedure";
import { connectConcept2Procedure } from "@/server/infra/trpc/activities/commands/connect-concept2.procedure";
import { connectRcaProcedure } from "@/server/infra/trpc/activities/commands/connect-rca.procedure";
import { connectStravaProcedure } from "@/server/infra/trpc/activities/commands/connect-strava.procedure";
import { createActivityAdminProcedure } from "@/server/infra/trpc/activities/commands/create-activity.admin.procedure";
import { createActivityProcedure } from "@/server/infra/trpc/activities/commands/create-activity.procedure";
import { deleteActivityAdminProcedure } from "@/server/infra/trpc/activities/commands/delete-activity.admin.procedure";
import { deleteActivityProcedure } from "@/server/infra/trpc/activities/commands/delete-activity.procedure";
import { disconnectConcept2Procedure } from "@/server/infra/trpc/activities/commands/disconnect-concept2.procedure";
import { disconnectRcaProcedure } from "@/server/infra/trpc/activities/commands/disconnect-rca.procedure";
import { disconnectStravaProcedure } from "@/server/infra/trpc/activities/commands/disconnect-strava.procedure";
import { processConcept2InboxBatchProcedure } from "@/server/infra/trpc/activities/commands/process-concept2-inbox-batch.procedure";
import { processStravaInboxBatchProcedure } from "@/server/infra/trpc/activities/commands/process-strava-inbox-batch.procedure";
import { syncConcept2ActivitiesProcedure } from "@/server/infra/trpc/activities/commands/sync-concept2-activities.procedure";
import { syncRcaProcedure } from "@/server/infra/trpc/activities/commands/sync-rca.procedure";
import { syncStravaActivitiesProcedure } from "@/server/infra/trpc/activities/commands/sync-strava-activities.procedure";
import { updateActivityAdminProcedure } from "@/server/infra/trpc/activities/commands/update-activity.admin.procedure";
import { updateActivityProcedure } from "@/server/infra/trpc/activities/commands/update-activity.procedure";
import { getActivitiesAdminProcedure } from "@/server/infra/trpc/activities/queries/get-activities.admin.procedure";
import { getActivitiesProcedure } from "@/server/infra/trpc/activities/queries/get-activities.procedure";
import { getActivityByIdAdminProcedure } from "@/server/infra/trpc/activities/queries/get-activity-by-id.admin.procedure";
import { getActivityByIdProcedure } from "@/server/infra/trpc/activities/queries/get-activity-by-id.procedure";
import { getActivityStrokesProcedure } from "@/server/infra/trpc/activities/queries/get-activity-strokes.procedure";
import { getConcept2ResultsProcedure } from "@/server/infra/trpc/activities/queries/get-concept2-results.procedure";
import { getConcept2UserProcedure } from "@/server/infra/trpc/activities/queries/get-concept2-user.procedure";
import { getPendingInboxBatchesProcedure } from "@/server/infra/trpc/activities/queries/get-pending-inbox-batches.procedure";
import { getStravaActivitiesProcedure } from "@/server/infra/trpc/activities/queries/get-strava-activities.procedure";
import { getStravaAthleteProcedure } from "@/server/infra/trpc/activities/queries/get-strava-athlete.procedure";
import { getAnalyticsProcedure } from "@/server/infra/trpc/analytics/queries/get-analytics.procedure";
import { getGroupMetersProcedure } from "@/server/infra/trpc/analytics/queries/get-group-meters.procedure";
import { getLeaderboardProcedure } from "@/server/infra/trpc/analytics/queries/get-leaderboard.procedure";
import { bulkCreateAthletesProcedure } from "@/server/infra/trpc/athletes/commands/bulk-create-athletes.procedure";
import { createAthleteProcedure } from "@/server/infra/trpc/athletes/commands/create-athlete.procedure";
import { updateAthleteProcedure } from "@/server/infra/trpc/athletes/commands/update-athlete.procedure";
import { getAthleteByIdProcedure } from "@/server/infra/trpc/athletes/queries/get-athlete-by-id.procedure";
import { getAthleteStatsProcedure } from "@/server/infra/trpc/athletes/queries/get-athlete-stats.procedure";
import { getAthletesProcedure } from "@/server/infra/trpc/athletes/queries/get-athletes.procedure";
import { getCurrentAthleteProcedure } from "@/server/infra/trpc/athletes/queries/get-current-athlete.procedure";
import { bulkCreateBoatsProcedure } from "@/server/infra/trpc/boats/commands/bulk-create-boats.procedure";
import { createBoatProcedure } from "@/server/infra/trpc/boats/commands/create-boat.procedure";
import { updateBoatProcedure } from "@/server/infra/trpc/boats/commands/update-boat.procedure";
import { getBoatByIdProcedure } from "@/server/infra/trpc/boats/queries/get-boat-by-id.procedure";
import { getBoatsProcedure } from "@/server/infra/trpc/boats/queries/get-boats.procedure";
import { addDmMembersProcedure } from "@/server/infra/trpc/chat/commands/add-dm-members.procedure";
import { deleteMessageProcedure } from "@/server/infra/trpc/chat/commands/delete-message.procedure";
import { editMessageProcedure } from "@/server/infra/trpc/chat/commands/edit-message.procedure";
import { forwardMessageProcedure } from "@/server/infra/trpc/chat/commands/forward-message.procedure";
import { leaveDmProcedure } from "@/server/infra/trpc/chat/commands/leave-dm.procedure";
import { markReadProcedure } from "@/server/infra/trpc/chat/commands/mark-read.procedure";
import { markUnreadProcedure } from "@/server/infra/trpc/chat/commands/mark-unread.procedure";
import { replyInThreadProcedure } from "@/server/infra/trpc/chat/commands/reply-in-thread.procedure";
import { sendMessageProcedure } from "@/server/infra/trpc/chat/commands/send-message.procedure";
import { startDmProcedure } from "@/server/infra/trpc/chat/commands/start-dm.procedure";
import { toggleReactionProcedure } from "@/server/infra/trpc/chat/commands/toggle-reaction.procedure";
import { getChannelsProcedure } from "@/server/infra/trpc/chat/queries/get-channels.procedure";
import { getMembersProcedure as getChatMembersProcedure } from "@/server/infra/trpc/chat/queries/get-members.procedure";
import { getMessagesProcedure } from "@/server/infra/trpc/chat/queries/get-messages.procedure";
import { getThreadProcedure } from "@/server/infra/trpc/chat/queries/get-thread.procedure";
import { createErgProcedure } from "@/server/infra/trpc/ergs/commands/create-erg.procedure";
import { deleteErgProcedure } from "@/server/infra/trpc/ergs/commands/delete-erg.procedure";
import { markErgProcedure } from "@/server/infra/trpc/ergs/commands/mark-erg.procedure";
import { updateErgProcedure } from "@/server/infra/trpc/ergs/commands/update-erg.procedure";
import { getErgByIdProcedure } from "@/server/infra/trpc/ergs/queries/get-erg-by-id.procedure";
import { getErgsProcedure } from "@/server/infra/trpc/ergs/queries/get-ergs.procedure";
import { submitProcedure } from "@/server/infra/trpc/feedback/commands/submit.procedure";
import { createGroupProcedure } from "@/server/infra/trpc/groups/commands/create-group.procedure";
import { deleteGroupProcedure } from "@/server/infra/trpc/groups/commands/delete-group.procedure";
import { updateGroupProcedure } from "@/server/infra/trpc/groups/commands/update-group.procedure";
import { getGroupByIdProcedure } from "@/server/infra/trpc/groups/queries/get-group-by-id.procedure";
import { getGroupsProcedure } from "@/server/infra/trpc/groups/queries/get-groups.procedure";
import { getMyGroupsProcedure } from "@/server/infra/trpc/groups/queries/get-my-groups.procedure";
import { router } from "@/server/infra/trpc/init";
import { inviteMembersProcedure } from "@/server/infra/trpc/members/commands/invite-members.procedure";
import { resendInvitationProcedure } from "@/server/infra/trpc/members/commands/resend-invitation.procedure";
import { revokeInvitationProcedure } from "@/server/infra/trpc/members/commands/revoke-invitation.procedure";
import { getMembersProcedure } from "@/server/infra/trpc/members/queries/get-members.procedure";
import { sendTestProcedure } from "@/server/infra/trpc/notifications/commands/send-test.procedure";
import { setPreferenceProcedure } from "@/server/infra/trpc/notifications/commands/set-preference.procedure";
import { subscribeProcedure } from "@/server/infra/trpc/notifications/commands/subscribe.procedure";
import { unsubscribeProcedure } from "@/server/infra/trpc/notifications/commands/unsubscribe.procedure";
import { getStatusProcedure } from "@/server/infra/trpc/notifications/queries/get-status.procedure";
import { getProgramsProcedure } from "@/server/infra/trpc/programs/queries/get-programs.procedure";
import { createEventProcedure } from "@/server/infra/trpc/schedule/commands/create-event.procedure";
import { createEventsProcedure } from "@/server/infra/trpc/schedule/commands/create-events.procedure";
import { deleteEventProcedure } from "@/server/infra/trpc/schedule/commands/delete-event.procedure";
import { getCalendarTokenProcedure } from "@/server/infra/trpc/schedule/commands/get-calendar-token.procedure";
import { nudgeProcedure } from "@/server/infra/trpc/schedule/commands/nudge.procedure";
import { rotateCalendarTokenProcedure } from "@/server/infra/trpc/schedule/commands/rotate-calendar-token.procedure";
import { rsvpProcedure } from "@/server/infra/trpc/schedule/commands/rsvp.procedure";
import { saveTrainingWeekProcedure } from "@/server/infra/trpc/schedule/commands/save-training-week.procedure";
import { updateEventProcedure } from "@/server/infra/trpc/schedule/commands/update-event.procedure";
import { getEventByIdProcedure } from "@/server/infra/trpc/schedule/queries/get-event-by-id.procedure";
import { getResponsesProcedure } from "@/server/infra/trpc/schedule/queries/get-responses.procedure";
import { getUpcomingProcedure } from "@/server/infra/trpc/schedule/queries/get-upcoming.procedure";
import { getWeekProcedure } from "@/server/infra/trpc/schedule/queries/get-week.procedure";
import { completeOnboardingProcedure } from "@/server/infra/trpc/users/commands/complete-onboarding.procedure";
import { updateUserProfileProcedure } from "@/server/infra/trpc/users/commands/update-user-profile.procedure";
import { getCurrentUserProcedure } from "@/server/infra/trpc/users/queries/get-current-user.procedure";
import { getUserByIdProcedure } from "@/server/infra/trpc/users/queries/get-user-by-id.procedure";
import { getUserByUserIdProcedure } from "@/server/infra/trpc/users/queries/get-user-by-user-id.procedure";
import { createWorkoutProcedure } from "@/server/infra/trpc/workouts/commands/create-workout.procedure";
import { updateWorkoutProcedure } from "@/server/infra/trpc/workouts/commands/update-workout.procedure";
import { getWorkoutByIdProcedure } from "@/server/infra/trpc/workouts/queries/get-workout-by-id.procedure";
import { getWorkoutsProcedure } from "@/server/infra/trpc/workouts/queries/get-workouts.procedure";

export const appRouter = router({
	athletes: router({
		getAthletes: getAthletesProcedure,
		getAthleteById: getAthleteByIdProcedure,
		getCurrentAthlete: getCurrentAthleteProcedure,
		getAthleteStats: getAthleteStatsProcedure,
		createAthlete: createAthleteProcedure,
		createAthletes: bulkCreateAthletesProcedure,
		updateAthlete: updateAthleteProcedure,
	}),
	groups: router({
		getGroups: getGroupsProcedure,
		getGroupById: getGroupByIdProcedure,
		getMyGroups: getMyGroupsProcedure,
		createGroup: createGroupProcedure,
		updateGroup: updateGroupProcedure,
		deleteGroup: deleteGroupProcedure,
	}),
	members: router({
		getMembers: getMembersProcedure,
		invite: inviteMembersProcedure,
		resendInvitation: resendInvitationProcedure,
		revokeInvitation: revokeInvitationProcedure,
	}),
	activities: router({
		getActivities: getActivitiesProcedure,
		getActivityById: getActivityByIdProcedure,
		getActivityStrokes: getActivityStrokesProcedure,
		createActivity: createActivityProcedure,
		updateActivity: updateActivityProcedure,
		deleteActivity: deleteActivityProcedure,
		attachActivityScreenshot: attachActivityScreenshotProcedure,
		getStravaAthlete: getStravaAthleteProcedure,
		getStravaActivities: getStravaActivitiesProcedure,
		connectStrava: connectStravaProcedure,
		disconnectStrava: disconnectStravaProcedure,
		syncStravaActivities: syncStravaActivitiesProcedure,
		getConcept2User: getConcept2UserProcedure,
		getConcept2Results: getConcept2ResultsProcedure,
		connectConcept2: connectConcept2Procedure,
		disconnectConcept2: disconnectConcept2Procedure,
		syncConcept2Activities: syncConcept2ActivitiesProcedure,
		connectRca: connectRcaProcedure,
		disconnectRca: disconnectRcaProcedure,
		syncRca: syncRcaProcedure,
		getPendingInboxBatches: getPendingInboxBatchesProcedure,
		processStravaInboxBatch: processStravaInboxBatchProcedure,
		processConcept2InboxBatch: processConcept2InboxBatchProcedure,
	}),
	boats: router({
		getBoats: getBoatsProcedure,
		getBoatById: getBoatByIdProcedure,
		createBoat: createBoatProcedure,
		createBoats: bulkCreateBoatsProcedure,
		updateBoat: updateBoatProcedure,
	}),
	workouts: router({
		getWorkouts: getWorkoutsProcedure,
		getWorkoutById: getWorkoutByIdProcedure,
		createWorkout: createWorkoutProcedure,
		updateWorkout: updateWorkoutProcedure,
	}),
	ergs: router({
		getErgs: getErgsProcedure,
		getErgById: getErgByIdProcedure,
		createErg: createErgProcedure,
		updateErg: updateErgProcedure,
		deleteErg: deleteErgProcedure,
		markErg: markErgProcedure,
	}),
	programs: router({
		getPrograms: getProgramsProcedure,
	}),
	users: router({
		getCurrentUser: getCurrentUserProcedure,
		getUserById: getUserByIdProcedure,
		getUserByUserId: getUserByUserIdProcedure,
		updateUserProfile: updateUserProfileProcedure,
		completeOnboarding: completeOnboardingProcedure,
	}),
	analytics: router({
		getAnalytics: getAnalyticsProcedure,
		getLeaderboard: getLeaderboardProcedure,
		getGroupMeters: getGroupMetersProcedure,
	}),
	admin: router({
		activities: router({
			getActivities: getActivitiesAdminProcedure,
			getActivityById: getActivityByIdAdminProcedure,
			createActivity: createActivityAdminProcedure,
			updateActivity: updateActivityAdminProcedure,
			deleteActivity: deleteActivityAdminProcedure,
		}),
	}),
	schedule: router({
		getWeek: getWeekProcedure,
		getEventById: getEventByIdProcedure,
		getResponses: getResponsesProcedure,
		getUpcoming: getUpcomingProcedure,
		rsvp: rsvpProcedure,
		nudge: nudgeProcedure,
		createEvent: createEventProcedure,
		createEvents: createEventsProcedure,
		updateEvent: updateEventProcedure,
		deleteEvent: deleteEventProcedure,
		saveTrainingWeek: saveTrainingWeekProcedure,
		getCalendarToken: getCalendarTokenProcedure,
		rotateCalendarToken: rotateCalendarTokenProcedure,
	}),
	notifications: router({
		getStatus: getStatusProcedure,
		subscribe: subscribeProcedure,
		unsubscribe: unsubscribeProcedure,
		setPreference: setPreferenceProcedure,
		sendTest: sendTestProcedure,
	}),
	chat: router({
		getChannels: getChannelsProcedure,
		getMembers: getChatMembersProcedure,
		getMessages: getMessagesProcedure,
		getThread: getThreadProcedure,
		sendMessage: sendMessageProcedure,
		replyInThread: replyInThreadProcedure,
		toggleReaction: toggleReactionProcedure,
		forwardMessage: forwardMessageProcedure,
		markRead: markReadProcedure,
		markUnread: markUnreadProcedure,
		startDm: startDmProcedure,
		addDmMembers: addDmMembersProcedure,
		leaveDm: leaveDmProcedure,
		deleteMessage: deleteMessageProcedure,
		editMessage: editMessageProcedure,
	}),
	feedback: router({
		submit: submitProcedure,
	}),
});

export type AppRouter = typeof appRouter;
