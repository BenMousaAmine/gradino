import { z } from "zod";

const label = z.string().max(20).optional();

export const figureSchema = z.discriminatedUnion("shape", [
  z.object({ shape: z.literal("rectangle"), base: label, height: label, diagonal: label }),
  z.object({ shape: z.literal("square"), side: label, diagonal: label }),
  z.object({ shape: z.literal("triangle"), base: label, height: label, left: label, right: label }),
  z.object({ shape: z.literal("right-triangle"), legA: label, legB: label, hypotenuse: label }),
  z.object({ shape: z.literal("trapezoid"), top: label, bottom: label, height: label, leg: label }),
  z.object({ shape: z.literal("rhombus"), d1: label, d2: label, side: label }),
  z.object({ shape: z.literal("triangle-angles"), a: label, b: label, c: label }),
]);

export type Figure = z.infer<typeof figureSchema>;
