import { z } from "zod";
import type { Difficulty, GeneratedItem, GeneratorFn } from "./build";
import { decimals, orderOfOperations, timesTable } from "./calc";
import {
  fractionAddSub,
  fractionCompare,
  fractionDecimals,
  fractionExpressions,
  fractionInverse,
  fractionMulDiv,
  fractionOfNumber,
  fractionSimplify,
} from "./fractions";
import {
  angles,
  inverseFormulas,
  pythagorasInFigures,
  pythagorasTheorem,
  pythagoreanTriples,
  quadrilateralArea,
  rectangleSquare,
  triangleArea,
} from "./geometry";
import { areaUnits, lengthMass, timeMeasures, volumeCapacity } from "./measures";
import { greatestCommonDivisor, leastCommonMultiple, primeFactorization } from "./number-theory";
import { powerBasics, powerProperties, rootEstimate, squareRoot } from "./powers";
import { missingDataProblems, multiStepProblems, oneStepProblems, planningProblems, segmentProblems } from "./problems";
import { createRandom } from "./random";
import { directProportionality, inverseProportionality, percent, percentProblems, proportions } from "./ratios";

export const GENERATORS: Record<string, GeneratorFn> = {
  "times-table": timesTable,
  "order-of-operations": orderOfOperations,
  decimals,
  "fraction-simplify": fractionSimplify,
  "fraction-compare": fractionCompare,
  "fraction-of-number": fractionOfNumber,
  "fraction-add-sub": fractionAddSub,
  "fraction-mul-div": fractionMulDiv,
  "fraction-decimals": fractionDecimals,
  "fraction-expressions": fractionExpressions,
  "fraction-inverse": fractionInverse,
  "prime-factorization": primeFactorization,
  gcd: greatestCommonDivisor,
  lcm: leastCommonMultiple,
  "power-basics": powerBasics,
  "power-properties": powerProperties,
  "square-root": squareRoot,
  "root-estimate": rootEstimate,
  percent,
  proportions,
  "percent-problems": percentProblems,
  "direct-proportionality": directProportionality,
  "inverse-proportionality": inverseProportionality,
  "length-mass": lengthMass,
  "area-units": areaUnits,
  "volume-capacity": volumeCapacity,
  "time-measures": timeMeasures,
  angles,
  "rectangle-square": rectangleSquare,
  "triangle-area": triangleArea,
  "quadrilateral-area": quadrilateralArea,
  "inverse-formulas": inverseFormulas,
  "pythagoras-theorem": pythagorasTheorem,
  "pythagorean-triples": pythagoreanTriples,
  "pythagoras-figures": pythagorasInFigures,
  "one-step-problems": oneStepProblems,
  "multi-step-problems": multiStepProblems,
  "segment-problems": segmentProblems,
  "planning-problems": planningProblems,
  "missing-data-problems": missingDataProblems,
};

export const generatorParamsSchema = z.object({
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

export function generateItem(generator: string, params: unknown, seed: number): GeneratedItem {
  const fn = GENERATORS[generator];
  if (!fn) throw new Error(`Unknown generator ${generator}`);
  const { difficulty } = generatorParamsSchema.parse(params);
  return fn(createRandom(seed), difficulty as Difficulty);
}
