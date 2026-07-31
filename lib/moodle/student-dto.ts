import { z } from "zod";

const TextSchema = z.string().max(16_384);
const TimestampSchema = z.number().int().nonnegative();
const OptionalProfileTextSchema = TextSchema.nullish().transform((value) => {
  const normalized = value?.trim();
  return normalized === undefined || normalized === "" ? undefined : normalized;
});

export const GradeReportSchema = z.object({
  usergrades: z.array(z.object({
    courseid: z.number().int().positive(),
    coursename: TextSchema.optional(),
    gradeitems: z.array(z.object({
      id: z.number().int().nonnegative(),
      itemname: TextSchema.nullish().transform((value) => value ?? "コース合計"),
      gradeformatted: TextSchema.optional(),
      percentageformatted: TextSchema.optional(),
      graderaw: z.number().nullable().optional(),
      grademax: z.number().nullable().optional(),
    })).default([]),
  })).default([]),
});

export const EnrolledUsersSchema = z.array(z.object({
  id: z.number().int().positive(),
  fullname: TextSchema,
  roles: z.array(z.object({
    name: TextSchema,
    shortname: TextSchema.nullish().transform((value) => value?.toLowerCase() ?? ""),
  })).default([]),
  profileimageurlsmall: z.url().nullish().transform((value) => value ?? undefined),
  lastaccess: TimestampSchema.optional(),
}));

export const UserProfilesSchema = z.array(z.object({
  id: z.number().int().positive(),
  // The core profile endpoint can return null or an empty string for optional
  // fields, and email is display data rather than input we need to validate.
  fullname: OptionalProfileTextSchema.transform((value) => value ?? "Moodleユーザー"),
  email: OptionalProfileTextSchema,
  city: OptionalProfileTextSchema,
  country: OptionalProfileTextSchema,
  description: OptionalProfileTextSchema,
}));

export const PrivateFilesInfoSchema = z.object({
  filecount: z.number().int().nonnegative().default(0),
  filesize: z.number().int().nonnegative().default(0),
  filesizeformatted: TextSchema.optional(),
  contextid: z.number().int().nonnegative().optional(),
});

export const MoodleFilesSchema = z.object({
  files: z.array(z.object({
    filename: TextSchema,
    filesize: z.number().int().nonnegative().optional(),
    mimetype: z.string().max(256).optional(),
    timemodified: TimestampSchema.optional(),
    url: z.url().optional(),
  })).default([]),
});

export const UserBadgesSchema = z.object({
  badges: z.array(z.object({
    id: z.number().int().positive(),
    name: TextSchema,
    description: TextSchema.optional(),
    dateissued: TimestampSchema.optional(),
    issuername: TextSchema.optional(),
  })).default([]),
});

export const UserPlansSchema = z.array(z.object({
  id: z.number().int().positive(),
  name: TextSchema,
  statusname: TextSchema.optional(),
  description: TextSchema.optional(),
  duedate: TimestampSchema.optional(),
}));

const MessageSchema = z.object({
  id: z.number().int().nonnegative(),
  // Moodle can use user id 0 for a system-originated message.
  useridfrom: z.number().int().nonnegative().nullish().transform((value) => value ?? 0),
  text: z.string().max(1_000_000).nullish().transform((value) => value ?? ""),
  timecreated: TimestampSchema.nullish().transform((value) => value ?? 0),
  isread: z.union([z.boolean(), z.literal(0), z.literal(1)]).optional().transform((value) => Boolean(value)),
});

export const ConversationSchema = z.object({
  id: z.number().int().positive(),
  name: TextSchema.nullish().transform((value) => value ?? "会話"),
  type: z.number().int().nonnegative().optional(),
  unreadcount: z.number().int().nonnegative().nullish().transform((value) => value ?? 0),
  members: z.array(z.object({ id: z.number().int().positive(), fullname: TextSchema })).default([]),
  messages: z.array(MessageSchema).default([]),
});

export const ConversationsSchema = z.object({
  conversations: z.array(ConversationSchema).default([]),
});
