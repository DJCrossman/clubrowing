import { attachActivityScreenshotProcedure } from "@/trpc/activities/commands/attach-activity-screenshot.procedure";
import { connectConcept2Procedure } from "@/trpc/activities/commands/connect-concept2.procedure";
import { connectRcaProcedure } from "@/trpc/activities/commands/connect-rca.procedure";
import { connectStravaProcedure } from "@/trpc/activities/commands/connect-strava.procedure";
import { createActivityAdminProcedure } from "@/trpc/activities/commands/create-activity.admin.procedure";
import { createActivityProcedure } from "@/trpc/activities/commands/create-activity.procedure";
import { deleteActivityAdminProcedure } from "@/trpc/activities/commands/delete-activity.admin.procedure";
import { deleteActivityProcedure } from "@/trpc/activities/commands/delete-activity.procedure";
import { disconnectConcept2Procedure } from "@/trpc/activities/commands/disconnect-concept2.procedure";
import { disconnectRcaProcedure } from "@/trpc/activities/commands/disconnect-rca.procedure";
import { disconnectStravaProcedure } from "@/trpc/activities/commands/disconnect-strava.procedure";
import { processConcept2InboxBatchProcedure } from "@/trpc/activities/commands/process-concept2-inbox-batch.procedure";
import { processStravaInboxBatchProcedure } from "@/trpc/activities/commands/process-strava-inbox-batch.procedure";
import { syncConcept2ActivitiesProcedure } from "@/trpc/activities/commands/sync-concept2-activities.procedure";
import { syncRcaProcedure } from "@/trpc/activities/commands/sync-rca.procedure";
import { syncStravaActivitiesProcedure } from "@/trpc/activities/commands/sync-strava-activities.procedure";
import { updateActivityAdminProcedure } from "@/trpc/activities/commands/update-activity.admin.procedure";
import { updateActivityProcedure } from "@/trpc/activities/commands/update-activity.procedure";
import { getActivitiesAdminProcedure } from "@/trpc/activities/queries/get-activities.admin.procedure";
import { getActivitiesProcedure } from "@/trpc/activities/queries/get-activities.procedure";
import { getActivityByIdAdminProcedure } from "@/trpc/activities/queries/get-activity-by-id.admin.procedure";
import { getActivityByIdProcedure } from "@/trpc/activities/queries/get-activity-by-id.procedure";
import { getActivityStrokesProcedure } from "@/trpc/activities/queries/get-activity-strokes.procedure";
import { getConcept2ResultsProcedure } from "@/trpc/activities/queries/get-concept2-results.procedure";
import { getConcept2UserProcedure } from "@/trpc/activities/queries/get-concept2-user.procedure";
import { getPendingInboxBatchesProcedure } from "@/trpc/activities/queries/get-pending-inbox-batches.procedure";
import { getStravaActivitiesProcedure } from "@/trpc/activities/queries/get-strava-activities.procedure";
import { getStravaAthleteProcedure } from "@/trpc/activities/queries/get-strava-athlete.procedure";
import { getAnalyticsProcedure } from "@/trpc/analytics/queries/get-analytics.procedure";
import { getGroupMetersProcedure } from "@/trpc/analytics/queries/get-group-meters.procedure";
import { getLeaderboardProcedure } from "@/trpc/analytics/queries/get-leaderboard.procedure";
import { bulkCreateAthletesProcedure } from "@/trpc/athletes/commands/bulk-create-athletes.procedure";
import { createAthleteProcedure } from "@/trpc/athletes/commands/create-athlete.procedure";
import { updateAthleteProcedure } from "@/trpc/athletes/commands/update-athlete.procedure";
import { getAthleteByIdProcedure } from "@/trpc/athletes/queries/get-athlete-by-id.procedure";
import { getAthleteStatsProcedure } from "@/trpc/athletes/queries/get-athlete-stats.procedure";
import { getAthletesProcedure } from "@/trpc/athletes/queries/get-athletes.procedure";
import { getCurrentAthleteProcedure } from "@/trpc/athletes/queries/get-current-athlete.procedure";
import { bulkCreateBoatsProcedure } from "@/trpc/boats/commands/bulk-create-boats.procedure";
import { createBoatProcedure } from "@/trpc/boats/commands/create-boat.procedure";
import { updateBoatProcedure } from "@/trpc/boats/commands/update-boat.procedure";
import { getBoatByIdProcedure } from "@/trpc/boats/queries/get-boat-by-id.procedure";
import { getBoatsProcedure } from "@/trpc/boats/queries/get-boats.procedure";
import { addDmMembersProcedure } from "@/trpc/chat/commands/add-dm-members.procedure";
import { deleteMessageProcedure } from "@/trpc/chat/commands/delete-message.procedure";
import { editMessageProcedure } from "@/trpc/chat/commands/edit-message.procedure";
import { forwardMessageProcedure } from "@/trpc/chat/commands/forward-message.procedure";
import { leaveDmProcedure } from "@/trpc/chat/commands/leave-dm.procedure";
import { markReadProcedure } from "@/trpc/chat/commands/mark-read.procedure";
import { markUnreadProcedure } from "@/trpc/chat/commands/mark-unread.procedure";
import { replyInThreadProcedure } from "@/trpc/chat/commands/reply-in-thread.procedure";
import { sendMessageProcedure } from "@/trpc/chat/commands/send-message.procedure";
import { startDmProcedure } from "@/trpc/chat/commands/start-dm.procedure";
import { toggleReactionProcedure } from "@/trpc/chat/commands/toggle-reaction.procedure";
import { getChannelsProcedure } from "@/trpc/chat/queries/get-channels.procedure";
import { getMembersProcedure as getChatMembersProcedure } from "@/trpc/chat/queries/get-members.procedure";
import { getMessagesProcedure } from "@/trpc/chat/queries/get-messages.procedure";
import { getThreadProcedure } from "@/trpc/chat/queries/get-thread.procedure";
import { createErgProcedure } from "@/trpc/ergs/commands/create-erg.procedure";
import { deleteErgProcedure } from "@/trpc/ergs/commands/delete-erg.procedure";
import { markErgProcedure } from "@/trpc/ergs/commands/mark-erg.procedure";
import { updateErgProcedure } from "@/trpc/ergs/commands/update-erg.procedure";
import { getErgByIdProcedure } from "@/trpc/ergs/queries/get-erg-by-id.procedure";
import { getErgsProcedure } from "@/trpc/ergs/queries/get-ergs.procedure";
import { submitProcedure } from "@/trpc/feedback/commands/submit.procedure";
import { createGroupProcedure } from "@/trpc/groups/commands/create-group.procedure";
import { deleteGroupProcedure } from "@/trpc/groups/commands/delete-group.procedure";
import { updateGroupProcedure } from "@/trpc/groups/commands/update-group.procedure";
import { getGroupByIdProcedure } from "@/trpc/groups/queries/get-group-by-id.procedure";
import { getGroupsProcedure } from "@/trpc/groups/queries/get-groups.procedure";
import { getMyGroupsProcedure } from "@/trpc/groups/queries/get-my-groups.procedure";
import { router } from "@/trpc/init";
import { inviteMembersProcedure } from "@/trpc/members/commands/invite-members.procedure";
import { resendInvitationProcedure } from "@/trpc/members/commands/resend-invitation.procedure";
import { revokeInvitationProcedure } from "@/trpc/members/commands/revoke-invitation.procedure";
import { getMembersProcedure } from "@/trpc/members/queries/get-members.procedure";
import { sendTestProcedure } from "@/trpc/notifications/commands/send-test.procedure";
import { setPreferenceProcedure } from "@/trpc/notifications/commands/set-preference.procedure";
import { subscribeProcedure } from "@/trpc/notifications/commands/subscribe.procedure";
import { unsubscribeProcedure } from "@/trpc/notifications/commands/unsubscribe.procedure";
import { getStatusProcedure } from "@/trpc/notifications/queries/get-status.procedure";
import { getProgramsProcedure } from "@/trpc/programs/queries/get-programs.procedure";
import { createEventProcedure } from "@/trpc/schedule/commands/create-event.procedure";
import { createEventsProcedure } from "@/trpc/schedule/commands/create-events.procedure";
import { deleteEventProcedure } from "@/trpc/schedule/commands/delete-event.procedure";
import { getCalendarTokenProcedure } from "@/trpc/schedule/commands/get-calendar-token.procedure";
import { nudgeProcedure } from "@/trpc/schedule/commands/nudge.procedure";
import { rotateCalendarTokenProcedure } from "@/trpc/schedule/commands/rotate-calendar-token.procedure";
import { rsvpProcedure } from "@/trpc/schedule/commands/rsvp.procedure";
import { saveTrainingWeekProcedure } from "@/trpc/schedule/commands/save-training-week.procedure";
import { updateEventProcedure } from "@/trpc/schedule/commands/update-event.procedure";
import { getEventByIdProcedure } from "@/trpc/schedule/queries/get-event-by-id.procedure";
import { getResponsesProcedure } from "@/trpc/schedule/queries/get-responses.procedure";
import { getUpcomingProcedure } from "@/trpc/schedule/queries/get-upcoming.procedure";
import { getWeekProcedure } from "@/trpc/schedule/queries/get-week.procedure";
import { completeOnboardingProcedure } from "@/trpc/users/commands/complete-onboarding.procedure";
import { updateUserProfileProcedure } from "@/trpc/users/commands/update-user-profile.procedure";
import { getCurrentUserProcedure } from "@/trpc/users/queries/get-current-user.procedure";
import { getUserByIdProcedure } from "@/trpc/users/queries/get-user-by-id.procedure";
import { getUserByUserIdProcedure } from "@/trpc/users/queries/get-user-by-user-id.procedure";
import { createWorkoutProcedure } from "@/trpc/workouts/commands/create-workout.procedure";
import { updateWorkoutProcedure } from "@/trpc/workouts/commands/update-workout.procedure";
import { getWorkoutByIdProcedure } from "@/trpc/workouts/queries/get-workout-by-id.procedure";
import { getWorkoutsProcedure } from "@/trpc/workouts/queries/get-workouts.procedure";

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
