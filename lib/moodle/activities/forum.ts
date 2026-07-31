import "server-only";

import { z } from "zod";

import { createAuthenticatedMoodleClient } from "@/lib/auth/server";
import { moodleDocumentFromHtml, type MoodleDocument } from "@/lib/moodle/html";
import type { MoodleCapabilityManifest } from "../capabilities";
import { MOODLE_FUNCTIONS } from "../functions";
import type { MoodleCourseId, MoodleCourseModuleId } from "../identifiers";
import { toMoodleReadFailure, type MoodleReadResult } from "../queries/dashboard";

const ForumSchema = z.object({
  id: z.number().int().positive(),
  course: z.number().int().positive(),
  cmid: z.number().int().positive(),
  name: z.string().min(1).max(16_384),
  intro: z.string().max(1_000_000).optional().default(""),
  type: z.string().max(80).optional().default("general"),
  cancreatediscussions: z.boolean().optional().default(false),
});
const DiscussionSchema = z.object({
  id: z.number().int().positive(),
  discussion: z.number().int().positive(),
  name: z.string().max(16_384).optional(),
  subject: z.string().max(16_384),
  message: z.string().max(1_000_000).optional().default(""),
  userfullname: z.string().max(500).optional().default(""),
  created: z.number().int().nonnegative().optional().default(0),
  modified: z.number().int().nonnegative().optional().default(0),
  numreplies: z.number().int().nonnegative().optional().default(0),
  numunread: z.number().int().nonnegative().optional().default(0),
  pinned: z.boolean().optional().default(false),
  locked: z.boolean().optional().default(false),
  canreply: z.boolean().optional().default(false),
  subscribed: z.boolean().optional().default(false),
});
const PostSchema = z.object({
  id: z.number().int().positive(),
  subject: z.string().max(16_384).optional().default(""),
  message: z.string().max(1_000_000).optional().default(""),
  author: z.object({ id: z.number().int().positive(), fullname: z.string().max(500) }).optional(),
  userid: z.number().int().positive().optional(),
  userfullname: z.string().max(500).optional(),
  timecreated: z.number().int().nonnegative().optional(),
  created: z.number().int().nonnegative().optional(),
  unread: z.boolean().optional().default(false),
  canreply: z.boolean().optional().default(false),
});

const ForumsResponseSchema = z.object({ forums: z.array(ForumSchema) });
export const ForumDiscussionsResponseSchema = z.object({ discussions: z.array(DiscussionSchema) });
export const ForumPostsResponseSchema = z.object({ posts: z.array(PostSchema) });

export type ForumDiscussion = Readonly<z.infer<typeof DiscussionSchema>>;
export type ForumPost = Readonly<{
  author: string;
  authorId: number | null;
  canReply: boolean;
  created: number;
  id: number;
  message: MoodleDocument;
  subject: string;
  unread: boolean;
}>;
export type ForumActivityData = Readonly<{
  canCreate: boolean;
  discussions: readonly ForumDiscussion[];
  id: number;
  name: string;
  operations: Readonly<{
    markRead: boolean;
    reply: boolean;
    subscribe: boolean;
  }>;
  posts: readonly ForumPost[];
  selectedDiscussionId: number | null;
  type: string;
}>;

type ForumRequest = Readonly<{
  cmid: MoodleCourseModuleId;
  courseId: MoodleCourseId;
  instance: number | null;
  manifest: MoodleCapabilityManifest;
  selectedDiscussionId: number | null;
  siteUrl: string;
}>;

export async function readForumActivity(
  request: ForumRequest,
): Promise<MoodleReadResult<ForumActivityData | null>> {
  try {
    const client = await createAuthenticatedMoodleClient();
    const forums = await client.call(
      MOODLE_FUNCTIONS.forums,
      { courseids: [request.courseId] },
      ForumsResponseSchema,
    );
    const forum = forums.data.forums.find((candidate) =>
      candidate.cmid === request.cmid || candidate.id === request.instance
    );
    if (forum === undefined) return { kind: "ready", data: null };
    const discussions = await client.call(
      MOODLE_FUNCTIONS.forumDiscussions,
      { forumid: forum.id, sortorder: -1, page: 0, perpage: 100, groupid: 0 },
      ForumDiscussionsResponseSchema,
    );
    const selected = request.selectedDiscussionId === null
      ? discussions.data.discussions[0]?.discussion ?? null
      : request.selectedDiscussionId;
    const belongs = selected !== null && discussions.data.discussions.some((item) => item.discussion === selected);
    const posts = !belongs ? null : await client.call(
      MOODLE_FUNCTIONS.forumDiscussionPosts,
      { discussionid: selected, sortby: "created", sortdirection: "ASC", includeinlineattachments: true },
      ForumPostsResponseSchema,
    );
    return {
      kind: "ready",
      data: {
        canCreate: forum.cancreatediscussions && request.manifest.operations["forum.create"] === "available",
        discussions: discussions.data.discussions,
        id: forum.id,
        name: forum.name,
        operations: {
          markRead: request.manifest.operations["forum.markRead"] === "available",
          reply: request.manifest.operations["forum.reply"] === "available",
          subscribe: request.manifest.operations["forum.subscribe"] === "available",
        },
        posts: (posts?.data.posts ?? []).map((post) => ({
          author: post.author?.fullname ?? post.userfullname ?? "参加者",
          authorId: post.author?.id ?? post.userid ?? null,
          canReply: post.canreply && request.manifest.operations["forum.reply"] === "available",
          created: post.timecreated ?? post.created ?? 0,
          id: post.id,
          message: moodleDocumentFromHtml(post.message, { siteUrl: request.siteUrl }),
          subject: post.subject,
          unread: post.unread,
        })),
        selectedDiscussionId: belongs ? selected : null,
        type: forum.type,
      },
    };
  } catch (error) {
    return toMoodleReadFailure(error);
  }
}
