import "server-only";
import { ANSWER_COLUMNS, byCreatedAt, RESPONSE_COLUMNS, responseToAnswer, toAnswer } from "@/lib/admin/queries";
import { addDays, dayInRome, startOfDayInRome } from "@/lib/study/dates";
import type { Admin } from "@/lib/study/exercises";
import { computeSignals, type Signals } from "./engine";

export async function loadSignals(admin: Admin, userId: string, days = 14): Promise<Signals> {
  const since = startOfDayInRome(addDays(dayInRome(), 1 - days));
  const [practice, responses] = await Promise.all([
    admin.from("practice_answers").select(ANSWER_COLUMNS).eq("user_id", userId).gte("created_at", since).limit(3000),
    admin.from("responses").select(RESPONSE_COLUMNS).eq("user_id", userId).gte("created_at", since).limit(3000),
  ]);
  if (practice.error) throw new Error(practice.error.message);
  if (responses.error) throw new Error(responses.error.message);
  return computeSignals([...practice.data.map(toAnswer), ...responses.data.map(responseToAnswer)].sort(byCreatedAt));
}
