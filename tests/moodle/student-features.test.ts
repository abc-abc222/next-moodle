import { expect, test } from "bun:test";
import { z } from "zod";

import { MoodleClient } from "@/lib/moodle/client";
import { MOODLE_FUNCTIONS } from "@/lib/moodle/functions";
import { MoodleCourseSectionsResponseSchema } from "@/lib/moodle/dto";
import { MoodleTokenSchema } from "@/lib/moodle/identifiers";
import { plainTextFromMoodleMessage } from "@/lib/security/html";
import { ConversationSchema, ConversationsSchema, UserProfilesSchema } from "@/lib/moodle/student-dto";
import { FIXTURE_USERS } from "@/mock/fixtures";
import { createMoodleMock } from "@/mock/moodle-server";

const StatusSchema = z.object({ status: z.boolean() });
const SendSchema = z.array(z.object({ msgid: z.number().int().positive() }));
const CalendarCreateSchema = z.object({ events: z.array(z.object({ id: z.number().int().positive() })) });
const CalendarEventsSchema = z.object({ events: z.array(z.object({ id: z.number().int().positive(), name: z.string() })) });

test("student features keep completion and messages isolated by user", async () => {
  // Given
  const mock = createMoodleMock();
  const server = await mock.start();
  const alice = new MoodleClient({
    config: { baseUrl: server.url, service: "moodle_mobile_app", timeoutMs: 500 },
    token: MoodleTokenSchema.parse(server.tokenFor("alice")),
  });
  const bob = new MoodleClient({
    config: { baseUrl: server.url, service: "moodle_mobile_app", timeoutMs: 500 },
    token: MoodleTokenSchema.parse(server.tokenFor("bob")),
  });

  try {
    // When
    const conversations = await alice.call(MOODLE_FUNCTIONS.conversations, { userid: FIXTURE_USERS.alice.userid }, ConversationsSchema);
    const conversationId = conversations.data.conversations[0]?.id;
    expect(conversationId).toBeDefined();
    if (conversationId === undefined) return;
    await alice.call(MOODLE_FUNCTIONS.sendConversationMessages, {
      conversationid: conversationId,
      "messages[0][text]": "Fixture reply",
      "messages[0][textformat]": 2,
    }, SendSchema);
    await alice.call(MOODLE_FUNCTIONS.updateActivityCompletion, { cmid: 9105, completed: true }, StatusSchema);
    const createdEvent = await alice.call(MOODLE_FUNCTIONS.createCalendarEvents, {
      "events[0][name]": "Private fixture event",
      "events[0][eventtype]": "user",
      "events[0][timestart]": 1_790_000_300,
    }, CalendarCreateSchema);
    const aliceConversation = await alice.call(MOODLE_FUNCTIONS.conversation, {
      userid: FIXTURE_USERS.alice.userid,
      conversationid: conversationId,
      includecontactrequests: false,
      includeprivacyinfo: false,
    }, ConversationSchema);
    const bobConversations = await bob.call(MOODLE_FUNCTIONS.conversations, { userid: FIXTURE_USERS.bob.userid }, ConversationsSchema);
    const aliceEvents = await alice.call(MOODLE_FUNCTIONS.calendarEvents, {}, CalendarEventsSchema);
    const bobEvents = await bob.call(MOODLE_FUNCTIONS.calendarEvents, {}, CalendarEventsSchema);
    const contents = await alice.call(MOODLE_FUNCTIONS.courseContents, { courseid: 101 }, MoodleCourseSectionsResponseSchema);

    // Then
    expect(aliceConversation.data.messages.at(-1)?.text).toBe("Fixture reply");
    expect(bobConversations.data.conversations[0]?.messages.at(-1)?.text).not.toBe("Fixture reply");
    expect(aliceEvents.data.events.some((event) => event.id === createdEvent.data.events[0]?.id)).toBe(true);
    expect(bobEvents.data.events.some((event) => event.id === createdEvent.data.events[0]?.id)).toBe(false);
    expect(contents.data.flatMap((section) => section.modules).find((module) => module.id === 9105)?.completiondata?.state).toBe(1);
  } finally {
    await mock.stop();
  }
});

test("Moodle 4.5 course files accept a null filepath without rejecting the course", () => {
  // Given
  const wire = [{
    id: 11,
    name: "Week one",
    modules: [{
      id: 101,
      name: "Reading",
      modname: "resource",
      contents: [{
        filename: "reading.pdf",
        filepath: null,
        fileurl: "https://moodle.example/webservice/pluginfile.php/1/reading.pdf",
      }],
    }],
  }];

  // When
  const parsed = MoodleCourseSectionsResponseSchema.safeParse(wire);

  // Then
  expect(parsed.success).toBe(true);
});

test("Moodle normalizes nullable profile fields instead of rejecting the profile page", () => {
  const parsed = UserProfilesSchema.parse([{
    id: 41,
    fullname: null,
    email: null,
    city: "",
    country: null,
    description: null,
  }]);

  expect(parsed).toEqual([{
    id: 41,
    fullname: "Moodleユーザー",
    email: undefined,
    city: undefined,
    country: undefined,
    description: undefined,
  }]);
});

test("Moodle normalizes nullable empty course sections", () => {
  const parsed = MoodleCourseSectionsResponseSchema.parse([{
    id: 11,
    name: "Week one",
    visible: "1",
    summary: null,
    modules: null,
  }]);

  expect(parsed[0]).toMatchObject({ id: 11, visible: 1, modules: [] });
  expect(parsed[0]?.summary).toBeUndefined();
});

test("Moodle 4.5 conversations normalize a null unread count to zero", () => {
  // Given
  const wire = {
    id: 21,
    name: "Course support",
    unreadcount: null,
    members: [],
    messages: [],
  };

  // When
  const parsed = ConversationSchema.parse(wire);

  // Then
  expect(parsed.unreadcount).toBe(0);
});

test("Moodle message markup becomes safe, readable plain text", () => {
  // Given
  const wire = {
    id: 21,
    name: "Course support",
    members: [],
    messages: [{
      id: 0,
      isread: 0,
      text: "<p>First line</p><p>Second <strong>line</strong></p><script>steal()</script>",
      timecreated: null,
      useridfrom: 0,
    }],
  };

  // When
  const parsed = ConversationSchema.parse(wire);
  const text = plainTextFromMoodleMessage(parsed.messages[0]?.text ?? "");

  // Then
  expect(parsed.messages[0]?.useridfrom).toBe(0);
  expect(parsed.messages[0]?.timecreated).toBe(0);
  expect(text).toBe("First line\nSecond line");
});

test("a malformed activity is isolated without rejecting its course section", () => {
  // Given
  const wire = [{
    id: 12,
    name: "Week two",
    modules: [
      {
        id: 102,
        name: "Broken resource",
        modname: "resource",
        contents: [{ filename: "broken.pdf", filepath: { invalid: true } }],
      },
      { id: 103, name: "Working page", modname: "page" },
    ],
  }];

  // When
  const parsed = MoodleCourseSectionsResponseSchema.parse(wire);

  // Then
  expect(parsed[0]?.modules).toHaveLength(2);
  expect(parsed[0]?.modules[0]?.integrity).toBe("malformed");
  expect(parsed[0]?.modules[1]?.integrity).toBe("ready");
});
