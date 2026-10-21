import { describe, expect, it } from "vitest";
import { WRITING_PROMPTS, findPrompt } from "./prompts";
import { aiFeedbackSchema, countWords, feedbackFromMessage, FEEDBACK_TOOL, writingPromptSchema } from "./schema";

const feedback = {
  score: 6,
  summary: "Il messaggio si capisce e hai svolto quasi tutti i punti.",
  covered: [
    { point: "Saluta e presentati", done: true },
    { point: "Fai una domanda", done: false },
  ],
  strengths: ["Hai usato bene I'm … years old."],
  fixes: [{ original: "I have 13 years", corrected: "I'm 13 years old", explanation: "In inglese l'età si dice con to be: I'm 13." }],
  nextStep: "Ripassa il verbo to be.",
};

describe("writing prompts", () => {
  it("are valid and unique", () => {
    for (const prompt of WRITING_PROMPTS) expect(writingPromptSchema.parse(prompt)).toEqual(prompt);
    expect(new Set(WRITING_PROMPTS.map((prompt) => prompt.id)).size).toBe(WRITING_PROMPTS.length);
    expect(WRITING_PROMPTS.length).toBe(10);
  });

  it("ask for a target above the minimum", () => {
    for (const prompt of WRITING_PROMPTS) expect(prompt.targetWords).toBeGreaterThan(prompt.minWords);
  });

  it("are found by id", () => {
    expect(findPrompt("dialogue-shop")?.kind).toBe("dialogue");
    expect(findPrompt("nope")).toBeUndefined();
  });
});

describe("countWords", () => {
  it("counts English words with contractions as one", () => {
    expect(countWords("Hi Tom, I'm 13 years old. What's your name?")).toBe(9);
    expect(countWords("A: Hello!\nB: Hi…")).toBe(4);
    expect(countWords("   ")).toBe(0);
  });
});

describe("AI feedback", () => {
  it("reads the forced tool call", () => {
    const parsed = feedbackFromMessage({
      model: "claude-sonnet-5-5",
      content: [
        { type: "text", text: "ok" },
        { type: "tool_use", id: "toolu_1", name: FEEDBACK_TOOL.name, input: feedback },
      ],
    });
    expect(parsed).toEqual({ feedback, model: "claude-sonnet-5-5" });
  });

  it("rejects a response without the tool call", () => {
    expect(() => feedbackFromMessage({ model: "m", content: [{ type: "text", text: "Voto 7" }] })).toThrow();
  });

  it("rejects out-of-range scores and too many fixes", () => {
    expect(aiFeedbackSchema.safeParse({ ...feedback, score: 11 }).success).toBe(false);
    expect(aiFeedbackSchema.safeParse({ ...feedback, fixes: Array(6).fill(feedback.fixes[0]) }).success).toBe(false);
  });

  it("requires every field in the tool schema", () => {
    expect([...FEEDBACK_TOOL.input_schema.required].sort()).toEqual(Object.keys(aiFeedbackSchema.shape).sort());
  });
});
