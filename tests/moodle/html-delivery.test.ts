import { describe, expect, test } from "bun:test";

import { deriveCapabilityManifest, activityDeliveryFor } from "@/lib/moodle/capabilities";
import { MOODLE_KNOWN_FUNCTION_NAMES } from "@/lib/moodle/functions";
import { resolveActivity } from "@/lib/moodle/activities/registry";

describe("HTML activity delivery", () => {
  test("keeps JavaScript-oriented Moodle modules in the typed HTML path even when APIs are available", () => {
    const manifest = deriveCapabilityManifest({
      fileAccess: { download: true, upload: true },
      functionNames: MOODLE_KNOWN_FUNCTION_NAMES,
      moodleRelease: "4.5",
    });

    for (const moduleName of ["scorm", "h5pactivity", "lti", "bigbluebuttonbn", "url"] as const) {
      expect(activityDeliveryFor(manifest, moduleName)).toBe("html");
      expect(resolveActivity(moduleName, manifest)).toEqual({ kind: "html", moduleName });
    }
  });
});
