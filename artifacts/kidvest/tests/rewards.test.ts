import assert from "node:assert/strict";
import test from "node:test";
import type { StoredRequest, StoredUser } from "../src/lib/domain";
import { familyRewards, kidRewards } from "../src/lib/rewards";

function kid(id: string, completedLessons: string[] = [], completedChallenges: string[] = []): StoredUser {
  return {
    id, name: id, role: "kid", avatar: "comet", isDemo: false, notifications: true,
    completedLessons, completedChallenges, identifier: id, passwordHash: "not-used",
    dailyLimit: 50, monthlyLimit: 200, revision: 0, createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function request(kidId: string, status: string, id: string): StoredRequest {
  return { id, kidId, status } as unknown as StoredRequest;
}

test("lesson, challenge and parent-approved activity rewards are calculated once per record", () => {
  const explorer = kid("kid-a", ["what-is-a-stock"], ["saving-goal", "saving-goal"]);
  const requests = [
    request("kid-a", "approved", "approved-a"),
    request("kid-a", "approved", "approved-b"),
    request("kid-a", "pending", "pending-a"),
  ];

  assert.deepEqual(kidRewards(explorer, requests), {
    xp: 140, coins: 35, completedLessonCount: 1, completedChallengeCount: 1, approvedRequestCount: 2,
  });
});

test("family totals never include another child's requests or pending/rejected activity", () => {
  const kids = [kid("kid-a", ["what-is-a-stock"]), kid("kid-b", [], ["risk-check"])];
  const requests = [
    request("kid-a", "approved", "approved-a"),
    request("kid-b", "rejected", "rejected-b"),
    request("real-family-kid", "approved", "other-family"),
  ];

  assert.deepEqual(familyRewards(kids, requests), {
    xp: 115, coins: 30, completedLessonCount: 1, completedChallengeCount: 1, approvedRequestCount: 1,
  });
});
