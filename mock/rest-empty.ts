import type { MoodleFunction } from "./types"

export const emptyPayload = (functionName: MoodleFunction): unknown => {
  switch (functionName) {
    case "core_webservice_get_site_info":
      return {}
    case "core_course_get_enrolled_courses_by_timeline_classification":
    case "core_enrol_get_users_courses":
      return functionName === "core_enrol_get_users_courses" ? [] : { courses: [], nextoffset: 0 }
    case "core_course_get_contents":
      return []
    case "core_completion_get_activities_completion_status":
      return { statuses: [] }
    case "core_calendar_get_action_events_by_timesort":
    case "core_calendar_get_calendar_upcoming_view":
      return { events: [], firstid: 0, lastid: 0, haslastevents: false, limit: 0 }
    case "core_calendar_get_calendar_monthly_view":
      return { year: 2026, month: 1, day: 1, events: [], courses: [], categories: [] }
    case "core_calendar_get_calendar_events":
      return { events: [], warnings: [] }
    case "core_calendar_create_calendar_events":
      return { events: [], warnings: [] }
    case "core_calendar_delete_calendar_events":
      return { status: true, warnings: [] }
    case "mod_assign_get_assignments":
      return { courses: [] }
    case "mod_assign_get_submission_status":
      return { assignmentid: 0, status: "new", gradingstatus: "notgraded", plugins: [] }
    case "mod_assign_save_submission":
    case "mod_assign_submit_for_grading":
    case "core_message_mark_notification_read":
      return { status: true, warnings: [] }
    case "message_popup_get_popup_notifications":
      return { notifications: [], newestfirst: true }
    case "message_popup_get_unread_popup_notification_count":
      return 0
    case "gradereport_user_get_grade_items":
      return { usergrades: [] }
    case "core_enrol_get_enrolled_users":
    case "core_user_get_users_by_field":
    case "core_competency_list_user_plans":
      return []
    case "core_user_get_private_files_info":
      return { filecount: 0, filesize: 0, filesizeformatted: "0 B" }
    case "core_files_get_files":
      return { parents: [], files: [] }
    case "core_badges_get_user_badges":
      return { badges: [] }
    case "core_message_get_conversations":
      return { conversations: [] }
    case "core_message_get_conversation":
      return { id: 1, name: "Conversation", unreadcount: 0, members: [], messages: [] }
    case "core_message_send_messages_to_conversation":
      return []
    case "core_completion_update_activity_completion_status_manually":
      return { status: true, warnings: [] }
    case "mod_quiz_get_quizzes_by_courses":
      return { quizzes: [], warnings: [] }
    case "mod_quiz_get_user_attempts":
      return { attempts: [], warnings: [] }
    case "mod_quiz_start_attempt":
      return { attempt: {}, warnings: [] }
    case "mod_quiz_get_attempt_data":
      return { attempt: {}, messages: [], nextpage: -1, questions: [], warnings: [] }
    case "mod_quiz_save_attempt":
      return { status: true, warnings: [] }
    case "mod_quiz_process_attempt":
      return { state: "finished", warnings: [] }
    case "mod_forum_get_forums_by_courses":
      return { forums: [], warnings: [] }
    case "mod_forum_get_forum_discussions":
      return { discussions: [], warnings: [] }
    case "mod_forum_get_discussion_posts":
      return { posts: [], forumid: 0, courseid: 0, warnings: [] }
    case "mod_forum_add_discussion_post":
      return { postid: 1, warnings: [] }
    case "mod_forum_add_discussion":
      return { discussionid: 1, warnings: [] }
    case "mod_forum_update_discussion_post":
    case "mod_forum_set_subscription_state":
    case "mod_forum_view_forum_discussion":
      return { status: true, warnings: [] }
    case "mod_choice_get_choices_by_courses":
      return { choices: [], warnings: [] }
    case "mod_choice_get_choice_options":
      return { options: [], warnings: [] }
    case "mod_choice_submit_choice_response":
      return { answers: [], warnings: [] }
    case "mod_glossary_get_glossaries_by_courses":
      return { glossaries: [], warnings: [] }
    case "mod_glossary_get_entries_by_letter":
      return { count: 0, entries: [], ratinginfo: {}, warnings: [] }
    case "mod_glossary_add_entry":
      return { entryid: 1, warnings: [] }
    case "mod_wiki_get_wikis_by_courses":
      return { wikis: [], warnings: [] }
    case "mod_wiki_get_subwiki_pages":
      return { pages: [], warnings: [] }
    case "mod_wiki_get_page_for_editing":
      return { pagesection: { content: "", contentformat: "html", version: 1, warnings: [] } }
    case "mod_wiki_edit_page":
      return { pageid: 1, warnings: [] }
    case "mod_feedback_get_feedbacks_by_courses":
      return { feedbacks: [], warnings: [] }
    case "mod_feedback_launch_feedback":
      return { gopage: 0, warnings: [] }
    case "mod_feedback_get_page_items":
      return { hasnextpage: false, hasprevpage: false, items: [], warnings: [] }
    case "mod_feedback_process_page":
      return { completed: true, completionpagecontents: "", jumpto: 0, siteaftersubmit: "", warnings: [] }
    case "mod_lesson_get_lessons_by_courses":
      return { lessons: [], warnings: [] }
    case "mod_lesson_launch_attempt":
      return { messages: [], warnings: [] }
    case "mod_lesson_get_page_data":
      return { answers: [], contentfiles: [], displaymenu: false, messages: [], newpageid: -9, ongoingcore: "", progress: null, warnings: [] }
    case "mod_lesson_process_page":
      return { newpageid: -9, warnings: [] }
    case "mod_lesson_finish_attempt":
      return { data: [], messages: [], warnings: [] }
    case "mod_data_get_databases_by_courses":
      return { databases: [], warnings: [] }
    case "mod_data_get_data_access_information":
      return { canaddentry: false, warnings: [] }
    case "mod_data_get_fields":
      return { fields: [], warnings: [] }
    case "mod_data_get_entries":
      return { entries: [], listviewcontents: "", totalcount: 0, totalfilesize: 0, warnings: [] }
    case "mod_data_add_entry":
      return { fieldnotifications: [], generalnotifications: [], newentryid: 1, warnings: [] }
    case "mod_workshop_get_workshops_by_courses":
      return { workshops: [], warnings: [] }
    case "mod_workshop_get_workshop_access_information":
      return { creatingsubmissionallowed: false, modifyingsubmissionallowed: false, warnings: [] }
    case "mod_workshop_get_user_plan":
      return { userplan: { examples: [], phases: [] }, warnings: [] }
    case "mod_workshop_get_submissions":
      return { submissions: [], totalcount: 0, totalfilesize: 0, warnings: [] }
    case "mod_workshop_add_submission":
    case "mod_workshop_update_submission":
      return { status: true, warnings: [] }
    case "mod_scorm_get_scorms_by_courses":
      return { options: [], scorms: [], warnings: [] }
    case "mod_scorm_get_scorm_attempt_count":
      return { attemptscount: 0, warnings: [] }
    case "mod_h5pactivity_get_h5pactivities_by_courses":
      return { h5pactivities: [], h5pglobalsettings: { enablesavestate: false }, warnings: [] }
    case "mod_h5pactivity_get_attempts":
      return { activityid: 1, usersattempts: [], warnings: [] }
    case "mod_lti_get_ltis_by_courses":
      return { ltis: [], warnings: [] }
    case "mod_lti_get_tool_launch_data":
      return { endpoint: "https://tool.synthetic.invalid/launch", parameters: [], warnings: [] }
    case "mod_bigbluebuttonbn_get_bigbluebuttonbns_by_courses":
      return { bigbluebuttonbns: [], warnings: [] }
    case "mod_bigbluebuttonbn_get_join_url":
      return { warnings: [] }
    default:
      return {}
  }
}
