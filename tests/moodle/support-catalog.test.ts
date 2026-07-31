import { expect, test } from "bun:test";

import { activityDeliveryFor, deriveCapabilityManifest } from "@/lib/moodle/capabilities";
import { MOODLE_FUNCTIONS } from "@/lib/moodle/functions";
import { studentSupportCatalog } from "@/lib/moodle/support-catalog";

test("student support catalog exposes only safe delivery decisions", () => {
  const manifest = deriveCapabilityManifest({
    companion: {
      adapters: [{ moduleName: "questionnaire", operations: ["read", "save", "submit"] }],
      contractVersion: 2,
    },
    fileAccess: { download: true, upload: true },
    functionNames: [
      MOODLE_FUNCTIONS.scorms,
      MOODLE_FUNCTIONS.scormAttempt,
      MOODLE_FUNCTIONS.adapterManifest,
      MOODLE_FUNCTIONS.adapterBranding,
      MOODLE_FUNCTIONS.activityAdapter,
      MOODLE_FUNCTIONS.executeActivityAction,
      MOODLE_FUNCTIONS.createRuntimeTicket,
    ],
    requireCompanion: true,
  });

  const catalog = studentSupportCatalog(manifest);

  expect(manifest.version).toBe(4);
  expect(activityDeliveryFor(manifest, "scorm")).toBe("runtime");
  expect(catalog).toContainEqual({
    delivery: "adapter",
    id: "questionnaire",
    kind: "plugin",
    label: "questionnaire",
    state: "adapter_required",
  });
  expect(JSON.stringify(catalog)).not.toContain("create_runtime_ticket");
});
