import { z } from "zod";

import { ActivityModuleNameSchema } from "../capabilities";

export const ACTIVITY_OPERATION_KEYS = [
  "read", "viewEvent", "complete", "save", "submit", "reply", "subscribe", "start", "review", "launch",
] as const;
export const ActivityOperationKeySchema = z.enum(ACTIVITY_OPERATION_KEYS);
export type ActivityOperationKey = z.infer<typeof ActivityOperationKeySchema>;

export const OfficialActivityDefinitionSchema = z.object({
  moduleName: ActivityModuleNameSchema,
  label: z.string().min(1).max(80),
  operations: z.array(ActivityOperationKeySchema),
  workspace: z.enum(["document", "submission", "assessment", "discussion", "form", "launch"]),
});
export type OfficialActivityDefinition = Readonly<z.infer<typeof OfficialActivityDefinitionSchema>>;
