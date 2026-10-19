import { numberItem, plainNumber, retry, round, type GeneratorFn } from "./build";
import type { Random } from "./random";

type Scale = { units: string[]; factor: number; name: string; tag: string };

const LENGTH: Scale = { units: ["km", "hm", "dam", "m", "dm", "cm", "mm"], factor: 10, name: "lunghezze", tag: "length_units" };
const MASS: Scale = { units: ["kg", "hg", "dag", "g", "dg", "cg", "mg"], factor: 10, name: "masse", tag: "mass_units" };
const AREA: Scale = { units: ["km²", "hm²", "dam²", "m²", "dm²", "cm²", "mm²"], factor: 100, name: "superfici", tag: "area_units_factor" };
const VOLUME: Scale = { units: ["m³", "dm³", "cm³", "mm³"], factor: 1000, name: "volumi", tag: "volume_units_factor" };
const CAPACITY: Scale = { units: ["hL", "daL", "L", "dL", "cL", "mL"], factor: 10, name: "capacità", tag: "capacity_units" };

function convert(value: number, from: number, to: number, factor: number): number {
  return round(value * factor ** (to - from));
}

function conversionItem(random: Random, scale: Scale, fromIndex: number, toIndex: number, value: number) {
  const steps = Math.abs(toIndex - fromIndex);
  const result = convert(value, fromIndex, toIndex, scale.factor);
  const bigger = toIndex > fromIndex;
  const from = scale.units[fromIndex];
  const to = scale.units[toIndex];
  const power = scale.factor ** steps;
  const wrongFactor = scale.factor === 10 ? 100 : 10;
  return numberItem({
    prompt: `Completa l'equivalenza: ${plainNumber(value)} ${from} = … ${to}`,
    value: result,
    suffix: to,
    errors: [
      {
        value: bigger ? value / power : value * power,
        tag: "units_direction",
        message: bigger
          ? "Da un'unità più grande a una più piccola il numero diventa più grande: si moltiplica."
          : "Da un'unità più piccola a una più grande il numero diventa più piccolo: si divide.",
      },
      {
        value: bigger ? value * wrongFactor ** steps : value / wrongFactor ** steps,
        tag: scale.tag,
        message: `Per le ${scale.name} ogni passaggio vale × ${scale.factor.toLocaleString("it-IT")}: da ${from} a ${to} ${steps === 1 ? "c'è 1 passaggio" : `ci sono ${steps} passaggi`}.`,
      },
      ...(steps > 1
        ? [{ value: bigger ? value * scale.factor : value / scale.factor, tag: "units_steps", message: `Conta tutti i passaggi tra ${from} e ${to}: sono ${steps}.` }]
        : []),
    ],
    solution: [
      `Da ${from} a ${to} ci sono ${steps} ${steps === 1 ? "passaggio" : "passaggi"}, ognuno vale × ${scale.factor.toLocaleString("it-IT")}.`,
      `${bigger ? "Moltiplico" : "Divido"} per ${power.toLocaleString("it-IT")}: ${plainNumber(value)} ${from} = ${plainNumber(result)} ${to}`,
    ],
  });
}

function pickValue(random: Random, decimals: boolean): number {
  return decimals ? random.int(11, 999) / 10 : random.int(2, 99);
}

function scaleConversion(random: Random, scale: Scale, difficulty: 1 | 2 | 3, common: Array<[number, number]>) {
  if (difficulty === 1) {
    const [from, to] = random.pick(common);
    return conversionItem(random, scale, from, to, pickValue(random, false));
  }
  if (difficulty === 2) {
    const [from, to] = random.pick(common);
    return conversionItem(random, scale, to, from, retry(random, (r) => {
      const value = r.int(2, 999) * scale.factor ** Math.max(0, Math.abs(to - from) - 1);
      return value > 0 ? value : null;
    }, 350));
  }
  const steps = scale.factor === 10 ? random.int(2, 3) : 2;
  const from = random.int(0, scale.units.length - 1 - steps);
  const to = from + steps;
  return random.chance(0.5)
    ? conversionItem(random, scale, from, to, random.int(11, 99) / 10)
    : conversionItem(random, scale, to, from, random.int(11, 999));
}

export const lengthMass: GeneratorFn = (random, difficulty) => {
  const mass = random.chance(0.4);
  if (difficulty === 3 && random.chance(0.5)) {
    if (mass) {
      const kg = random.int(1, 4);
      const g = random.int(1, 9) * 50;
      return numberItem({
        prompt: `Completa: ${kg} kg + ${g} g = … g`,
        value: kg * 1000 + g,
        suffix: "g",
        errors: [{ value: kg + g, tag: "units_mixed", message: "Prima porta tutto alla stessa unità: 1 kg = 1000 g." }],
        solution: [`$${kg}$ kg = ${kg * 1000} g`, `${kg * 1000} + ${g} = ${kg * 1000 + g} g`],
      });
    }
    const km = random.int(1, 5);
    const m = random.int(1, 19) * 50;
    return numberItem({
      prompt: `Completa: ${km} km + ${m} m = … m`,
      value: km * 1000 + m,
      suffix: "m",
      errors: [{ value: km + m, tag: "units_mixed", message: "Prima porta tutto alla stessa unità: 1 km = 1000 m." }],
      solution: [`${km} km = ${km * 1000} m`, `${km * 1000} + ${m} = ${km * 1000 + m} m`],
    });
  }
  return mass
    ? scaleConversion(random, MASS, difficulty, [
        [0, 3],
        [3, 6],
        [1, 3],
      ])
    : scaleConversion(random, LENGTH, difficulty, [
        [3, 5],
        [3, 6],
        [0, 3],
        [5, 6],
      ]);
};

export const areaUnits: GeneratorFn = (random, difficulty) =>
  scaleConversion(random, AREA, difficulty, [
    [3, 4],
    [4, 5],
    [3, 5],
    [5, 6],
  ]);

export const volumeCapacity: GeneratorFn = (random, difficulty) => {
  if (difficulty === 1) {
    const variant = random.int(0, 2);
    const value = random.int(2, 50);
    if (variant === 0) {
      return numberItem({
        prompt: `Completa: ${value} dm³ = … L`,
        value,
        suffix: "L",
        errors: [
          { value: value * 1000, tag: "volume_capacity", message: "1 dm³ contiene esattamente 1 litro." },
          { value: value * 10, tag: "volume_capacity", message: "1 dm³ contiene esattamente 1 litro." },
        ],
        solution: ["1 dm³ = 1 L", `${value} dm³ = ${value} L`],
      });
    }
    if (variant === 1) {
      const cm3 = value * 10;
      return numberItem({
        prompt: `Completa: ${cm3} cm³ = … mL`,
        value: cm3,
        suffix: "mL",
        errors: [{ value: cm3 / 1000, tag: "volume_capacity", message: "1 cm³ contiene esattamente 1 millilitro." }],
        solution: ["1 cm³ = 1 mL", `${cm3} cm³ = ${cm3} mL`],
      });
    }
    return conversionItem(random, CAPACITY, 2, 5, value);
  }
  if (difficulty === 2) return scaleConversion(random, VOLUME, 2, [[0, 1], [1, 2]]);
  const variant = random.int(0, 2);
  if (variant === 0) {
    const m3 = random.int(1, 40) / 20;
    return numberItem({
      prompt: `Completa: ${plainNumber(m3)} m³ = … L`,
      value: m3 * 1000,
      suffix: "L",
      errors: [
        { value: m3 * 100, tag: "volume_units_factor", message: "1 m³ = 1000 dm³ = 1000 L." },
        { value: m3 * 10, tag: "volume_units_factor", message: "1 m³ = 1000 dm³ = 1000 L." },
      ],
      solution: ["1 m³ = 1000 dm³ e 1 dm³ = 1 L", `${plainNumber(m3)} m³ = ${plainNumber(m3 * 1000)} L`],
    });
  }
  if (variant === 1) {
    const cm3 = random.int(1, 39) * 50;
    return numberItem({
      prompt: `Completa: ${cm3} cm³ = … L`,
      value: cm3 / 1000,
      suffix: "L",
      errors: [
        { value: cm3 / 100, tag: "volume_units_factor", message: "1 L = 1 dm³ = 1000 cm³." },
        { value: cm3, tag: "volume_capacity", message: "1 cm³ è 1 millilitro, non 1 litro." },
      ],
      solution: ["1 L = 1 dm³ = 1000 cm³", `${cm3} : 1000 = ${plainNumber(cm3 / 1000)} L`],
    });
  }
  const dm3 = random.int(11, 99) / 10;
  return numberItem({
    prompt: `Completa: ${plainNumber(dm3)} dm³ = … mL`,
    value: dm3 * 1000,
    suffix: "mL",
    errors: [{ value: dm3 * 100, tag: "volume_units_factor", message: "1 dm³ = 1 L = 1000 mL." }],
    solution: ["1 dm³ = 1 L = 1000 mL", `${plainNumber(dm3)} × 1000 = ${plainNumber(dm3 * 1000)} mL`],
  });
};

function clock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

export const timeMeasures: GeneratorFn = (random, difficulty) => {
  if (difficulty === 1) {
    const h = random.int(1, 4);
    const m = random.int(1, 11) * 5;
    return numberItem({
      prompt: `Completa: ${h} h ${m} min = … min`,
      value: h * 60 + m,
      suffix: "min",
      errors: [{ value: h * 100 + m, tag: "time_decimal", message: "Un'ora ha 60 minuti, non 100." }],
      solution: [`${h} h = ${h} × 60 = ${h * 60} min`, `${h * 60} + ${m} = ${h * 60 + m} min`],
    });
  }
  if (difficulty === 2) {
    const quarters = random.pick([1, 2, 3]);
    const h = random.int(1, 4);
    const value = h + quarters / 4;
    return numberItem({
      prompt: `Completa: ${plainNumber(value)} h = … min`,
      value: value * 60,
      suffix: "min",
      errors: [
        { value: value * 100, tag: "time_decimal", message: "Le ore non sono in base 100: un'ora ha 60 minuti." },
        { value: h * 60 + quarters * 25, tag: "time_decimal", message: `${plainNumber(quarters / 4)} h non sono ${quarters * 25} minuti: sono ${quarters * 15} minuti.` },
      ],
      solution: [`${plainNumber(value)} h = ${h} h + ${plainNumber(quarters / 4)} h`, `${plainNumber(quarters / 4)} h = ${quarters * 15} min`, `${h * 60} + ${quarters * 15} = ${value * 60} min`],
    });
  }
  const start = random.int(14 * 12, 21 * 12) * 5;
  const duration = random.int(13, 40) * 5;
  const end = start + duration;
  const wrong = Math.round((Math.floor(end / 60) * 100 + (end % 60)) - (Math.floor(start / 60) * 100 + (start % 60)));
  const toNextHour = 60 - (start % 60);
  return numberItem({
    prompt: `Un film inizia alle ${clock(start)} e finisce alle ${clock(end)}. Quanti minuti dura?`,
    value: duration,
    suffix: "min",
    errors: [{ value: wrong, tag: "time_decimal", message: "Non si sottraggono gli orari come numeri decimali: un'ora ha 60 minuti." }],
    solution: [
      toNextHour < 60 ? `Dalle ${clock(start)} alle ${clock(start + toNextHour)}: ${toNextHour} min` : `Parto dalle ${clock(start)}`,
      `Poi fino alle ${clock(end)}: ${duration - (toNextHour < 60 ? toNextHour : 0)} min`,
      `In tutto: ${duration} min`,
    ],
  });
};
