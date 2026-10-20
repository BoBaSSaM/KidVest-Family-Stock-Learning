import { lessonCatalog } from "./lessons";
import type { StoredRequest, StoredUser } from "./domain";

export function kidRewards(kid: StoredUser, requests: StoredRequest[]) {
  const completedLessons = new Set(kid.completedLessons ?? []);
  const completedChallenges = new Set(kid.completedChallenges ?? []);
  const lessonXp = lessonCatalog
    .filter(lesson => completedLessons.has(lesson.id))
    .reduce((total, lesson) => total + lesson.xp, 0);
  const completedRequestCount = requests.filter(request => request.kidId === kid.id && request.status === "approved").length;
  const challengeCount = completedChallenges.size;

  const earnedLessonCount = lessonCatalog.filter(lesson => completedLessons.has(lesson.id)).length;
  return {
    xp: lessonXp + challengeCount * 40 + completedRequestCount * 25,
    coins: earnedLessonCount * 10 + challengeCount * 15 + completedRequestCount * 5,
    completedLessonCount: earnedLessonCount,
    completedChallengeCount: challengeCount,
    approvedRequestCount: completedRequestCount,
  };
}

export function familyRewards(kids: StoredUser[], requests: StoredRequest[]) {
  return kids.reduce(
    (total, kid) => {
      const rewards = kidRewards(kid, requests);
      total.xp += rewards.xp;
      total.coins += rewards.coins;
      total.completedLessonCount += rewards.completedLessonCount;
      total.completedChallengeCount += rewards.completedChallengeCount;
      total.approvedRequestCount += rewards.approvedRequestCount;
      return total;
    },
    { xp: 0, coins: 0, completedLessonCount: 0, completedChallengeCount: 0, approvedRequestCount: 0 },
  );
}
