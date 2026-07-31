import "server-only";

import { cache } from "react";

import { createAuthenticatedMoodleClient } from "@/lib/auth/server";
import {
  MOODLE_FUNCTIONS,
  MoodleEnrolledCoursesResponseSchema,
  type MoodleCourseId,
  type MoodleUserId,
} from "@/lib/moodle/server";
import { moodleFileProxyPath } from "@/lib/security/moodle-file";
import { plainTextFromMoodleMessage } from "@/lib/security/html";
import {
  ConversationSchema,
  ConversationsSchema,
  EnrolledUsersSchema,
  GradeReportSchema,
  MoodleFilesSchema,
  PrivateFilesInfoSchema,
  UserBadgesSchema,
  UserPlansSchema,
  UserProfilesSchema,
} from "../student-dto";
import { toMoodleReadFailure, type MoodleReadResult } from "./dashboard";

export type StudentLedgerRow = Readonly<{
  href?: string;
  id: string;
  meta: string;
  timestamp?: number;
  title: string;
  value?: string;
}>;

export type StudentAreaData = Readonly<{
  metric: string;
  rows: readonly StudentLedgerRow[];
}>;

export type ConversationListItem = Readonly<{
  id: number;
  name: string;
  preview: string;
  unreadCount: number;
}>;

export type ConversationDetail = Readonly<{
  id: number;
  members: readonly string[];
  messages: readonly Readonly<{ id: number; fromCurrentUser: boolean; text: string; time: number }>[];
  name: string;
}>;

export const readGrades = cache(async (
  userId: MoodleUserId,
): Promise<MoodleReadResult<StudentAreaData>> => {
  try {
    const client = await createAuthenticatedMoodleClient();
    const enrolled = await client.call(MOODLE_FUNCTIONS.enrolledCourses, { userid: userId }, MoodleEnrolledCoursesResponseSchema);
    const reports = await Promise.all(enrolled.data.map((course) => client.call(
      MOODLE_FUNCTIONS.grades,
      { courseid: course.id, userid: userId },
      GradeReportSchema,
    )));
    const rows = reports.flatMap((report) => report.data.usergrades.flatMap((grade) =>
      grade.gradeitems.map((item) => ({
        id: `${grade.courseid}:${item.id}`,
        meta: grade.coursename ?? enrolled.data.find((course) => course.id === grade.courseid)?.fullname ?? "コース",
        title: item.itemname,
        value: item.percentageformatted ?? item.gradeformatted ?? "—",
      })),
    ));
    return { kind: "ready", data: { metric: `${rows.length}項目`, rows } };
  } catch (error) {
    return toMoodleReadFailure(error);
  }
});

export const readPeople = cache(async (
  courseId: MoodleCourseId,
): Promise<MoodleReadResult<StudentAreaData>> => {
  try {
    const client = await createAuthenticatedMoodleClient();
    const response = await client.call(MOODLE_FUNCTIONS.participants, {
      courseid: courseId,
      "options[0][name]": "limitfrom",
      "options[0][value]": 0,
      "options[1][name]": "limitnumber",
      "options[1][value]": 100,
    }, EnrolledUsersSchema);
    const rows = response.data.map((person) => ({
      id: String(person.id),
      meta: person.roles.map((role) => role.name).join(" / ") || "参加者",
      title: person.fullname,
    }));
    return { kind: "ready", data: { metric: `${rows.length}人`, rows } };
  } catch (error) {
    return toMoodleReadFailure(error);
  }
});

export const readProfile = cache(async (
  userId: MoodleUserId,
): Promise<MoodleReadResult<StudentAreaData>> => {
  try {
    const client = await createAuthenticatedMoodleClient();
    const response = await client.call(
      MOODLE_FUNCTIONS.usersByField,
      { field: "id", values: [userId] },
      UserProfilesSchema,
    );
    const profile = response.data[0];
    const rows = profile === undefined ? [] : [
      { id: "name", meta: "表示名", title: profile.fullname },
      ...(profile.email === undefined ? [] : [{ id: "email", meta: "メール", title: profile.email }]),
      ...(profile.city === undefined ? [] : [{ id: "city", meta: "地域", title: [profile.city, profile.country].filter(Boolean).join(", ") }]),
      ...(profile.timezone === undefined ? [] : [{ id: "timezone", meta: "タイムゾーン", title: profile.timezone }]),
    ];
    return { kind: "ready", data: { metric: `User ${userId}`, rows } };
  } catch (error) {
    return toMoodleReadFailure(error);
  }
});

export const readPrivateFiles = cache(async (
  userId: MoodleUserId,
  siteUrl: string,
): Promise<MoodleReadResult<StudentAreaData>> => {
  try {
    const client = await createAuthenticatedMoodleClient();
    const info = await client.call(MOODLE_FUNCTIONS.privateFiles, {}, PrivateFilesInfoSchema);
    const contextId = info.data.contextid;
    if (contextId === undefined) {
      return { kind: "ready", data: { metric: info.data.filesizeformatted ?? `${info.data.filesize} bytes`, rows: [] } };
    }
    const files = await client.call(MOODLE_FUNCTIONS.files, {
      contextid: contextId,
      component: "user",
      filearea: "private",
      itemid: 0,
      filepath: "/",
      filename: "",
    }, MoodleFilesSchema);
    const rows = files.data.files.map((file, index) => {
      const href = file.url === undefined ? null : moodleFileProxyPath(file.url, siteUrl);
      return {
        ...(href === null ? {} : { href }),
        id: `${index}:${file.filename}`,
        meta: file.mimetype ?? "ファイル",
        title: file.filename,
        ...(file.filesize === undefined ? {} : { value: `${file.filesize} bytes` }),
      };
    });
    return { kind: "ready", data: { metric: `${info.data.filecount}ファイル`, rows } };
  } catch (error) {
    return toMoodleReadFailure(error);
  }
});

export const readBadges = cache(async (
  userId: MoodleUserId,
): Promise<MoodleReadResult<StudentAreaData>> => {
  try {
    const client = await createAuthenticatedMoodleClient();
    const response = await client.call(MOODLE_FUNCTIONS.badges, { userid: userId }, UserBadgesSchema);
    const rows = response.data.badges.map((badge) => ({ id: String(badge.id), meta: badge.issuername ?? "バッジ", title: badge.name, ...(badge.dateissued === undefined ? {} : { timestamp: badge.dateissued }) }));
    return { kind: "ready", data: { metric: `${rows.length}件`, rows } };
  } catch (error) {
    return toMoodleReadFailure(error);
  }
});

export const readPlans = cache(async (
  userId: MoodleUserId,
): Promise<MoodleReadResult<StudentAreaData>> => {
  try {
    const client = await createAuthenticatedMoodleClient();
    const response = await client.call(MOODLE_FUNCTIONS.plans, { userid: userId }, UserPlansSchema);
    const rows = response.data.map((plan) => ({ id: String(plan.id), meta: plan.statusname ?? "学習プラン", title: plan.name, ...(plan.duedate === undefined ? {} : { timestamp: plan.duedate }) }));
    return { kind: "ready", data: { metric: `${rows.length}件`, rows } };
  } catch (error) {
    return toMoodleReadFailure(error);
  }
});

export const readConversations = cache(async (
  userId: MoodleUserId,
): Promise<MoodleReadResult<readonly ConversationListItem[]>> => {
  try {
    const client = await createAuthenticatedMoodleClient();
    const response = await client.call(MOODLE_FUNCTIONS.conversations, { userid: userId, limitfrom: 0, limitnum: 100 }, ConversationsSchema);
    return { kind: "ready", data: response.data.conversations.map((conversation) => ({
      id: conversation.id,
      name: plainTextFromMoodleMessage(conversation.name) || "会話",
      preview: plainTextFromMoodleMessage(conversation.messages.at(-1)?.text ?? "") || "メッセージはありません",
      unreadCount: conversation.unreadcount,
    })) };
  } catch (error) {
    return toMoodleReadFailure(error);
  }
});

export const readConversation = cache(async (
  userId: MoodleUserId,
  conversationId: number,
): Promise<MoodleReadResult<ConversationDetail>> => {
  try {
    const client = await createAuthenticatedMoodleClient();
    // Unlike the pagination fields, these two privacy-related arguments are
    // required by core_message_get_conversation. Moodle returns an
    // invalid-parameter envelope when either is omitted.
    const response = await client.call(MOODLE_FUNCTIONS.conversation, {
      userid: userId,
      conversationid: conversationId,
      includecontactrequests: false,
      includeprivacyinfo: false,
      memberlimit: 0,
      memberoffset: 0,
      messagelimit: 0,
      messageoffset: 0,
      newestmessagesfirst: false,
    }, ConversationSchema);
    return { kind: "ready", data: {
      id: response.data.id,
      members: response.data.members.map((member) => plainTextFromMoodleMessage(member.fullname) || "参加者"),
      messages: response.data.messages.map((message) => ({
        id: message.id,
        fromCurrentUser: message.useridfrom === userId,
        text: plainTextFromMoodleMessage(message.text),
        time: message.timecreated,
      })),
      name: plainTextFromMoodleMessage(response.data.name) || "会話",
    } };
  } catch (error) {
    return toMoodleReadFailure(error);
  }
});
