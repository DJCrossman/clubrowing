import { z } from "zod";

const stravaUserFieldsSchema = z.object({
	id: z.coerce.string(),
	id_str: z.string().optional(),
	username: z.string().nullable().optional(),
	resource_state: z.number(),
	firstname: z.string(),
	lastname: z.string(),
	bio: z.string().nullable().optional(),
	city: z.string().nullable().optional(),
	state: z.string().nullable().optional(),
	country: z.string().nullable().optional(),
	sex: z.string().nullable().optional(),
	premium: z.boolean().optional(),
	summit: z.boolean().optional(),
	created_at: z.string(),
	updated_at: z.string(),
	badge_type_id: z.number().optional(),
	weight: z.number().nullable().optional(),
	profile_medium: z.string(),
	profile: z.string(),
	friend: z.null().optional(),
	follower: z.null().optional(),
});

export const stravaUserSchema = stravaUserFieldsSchema.transform((athlete) => ({
	...athlete,
	id: athlete.id_str ?? athlete.id,
}));

export type StravaUser = z.infer<typeof stravaUserSchema>;

export const getStravaAthleteInputSchema = z.object({
	accessToken: z.string().optional(),
});
export type GetStravaAthleteInput = z.infer<typeof getStravaAthleteInputSchema>;

export const stravaTokenDataSchema = z.object({
	access_token: z.string(),
	refresh_token: z.string(),
	expires_in: z.number(),
	expires_at: z.number(),
	token_type: z.string(),
	athlete: stravaUserSchema,
});
export type StravaTokenDataInput = z.infer<typeof stravaTokenDataSchema>;

export const connectStravaInputSchema = z.object({
	tokens: stravaTokenDataSchema,
	athlete: stravaUserSchema,
});
export type ConnectStravaInput = z.infer<typeof connectStravaInputSchema>;
