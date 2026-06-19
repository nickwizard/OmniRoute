import { describe, it } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";

const modalPath =
  "src/app/(dashboard)/dashboard/providers/[id]/components/modals/EditConnectionModal.tsx";
const source = readFileSync(modalPath, "utf8");

describe("agy Project ID UI support", () => {
  it("declares isAgy from provider", () => {
    assert.ok(
      source.includes('const isAgy = provider === "agy"'),
      "isAgy must be declared via provider === 'agy'"
    );
  });

  it("declares isAntigravityFamily = isAntigravity || isAgy", () => {
    assert.ok(
      source.includes("const isAntigravityFamily = isAntigravity || isAgy;"),
      "isAntigravityFamily must combine antigravity and agy"
    );
  });

  it("includes isAntigravityFamily in supportsGoogleProjectId", () => {
    assert.ok(
      source.includes("const supportsGoogleProjectId = isGeminiCli || isAntigravityFamily;"),
      "supportsGoogleProjectId must include isAntigravityFamily"
    );
  });

  it("uses isAntigravityFamily for antigravityProjectIdLabel", () => {
    assert.ok(
      source.includes('isAntigravityFamily ? t("antigravityProjectIdLabel")'),
      "projectId label must reference isAntigravityFamily"
    );
  });

  it("uses isAntigravityFamily for antigravityClientProfile UI", () => {
    assert.ok(
      source.includes("{isAntigravityFamily && (\n              <Select"),
      "client profile Select must render for isAntigravityFamily"
    );
  });

  it("uses isAntigravityFamily for client profile save", () => {
    assert.ok(
      source.includes("if (isAntigravityFamily) {"),
      "client profile save must use isAntigravityFamily"
    );
  });
});
