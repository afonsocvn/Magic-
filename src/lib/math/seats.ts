import { atLeastMana, manaDevelopment, type TurnDevelopment } from "./development";
import { atLeast, HAND_SIZE } from "./hypergeometric";
import { cardsSeen, type TableContext } from "./table";

export const SEAT_TURNS = 8;
/** Deck de referência: o máximo da mão inicial (36 terrenos, 12 rampa barata). */
export const REFERENCE = { lands: 36, ramp: 12, rampCost: 2 };
/** Pressuposto: cada adversário joga a primeira ameaça relevante no seu turno 3. */
export const THREAT_TURN = 3;

export type DeckProfile = {
  N: number;
  lands: number;
  cheapRamp: number;
  rampCost: number;
  /** Cartas com remoção, wipe ou counter */
  interaction: number;
  commanderMv: number | null;
};

export type SeatAnalysis = {
  seat: number;
  drawsFirstTurn: boolean;
  development: TurnDevelopment[];
  reference: TurnDevelopment[];
  /** Momento global (1 = primeiro turno da mesa) de cada um dos teus turnos */
  globalStep: number[];
  /** Primeiro dos teus turnos com P(≥ 4 de mana) ≥ 50 % (null se não chegar até ao turno 8) */
  fourManaTurn: number | null;
  referenceFourManaTurn: number | null;
  commander: { onCurve: number | null; typicalTurn: number | null } | null;
  /** P(≥ 1 interação na mão até ao teu turno t), t = 1..4 */
  interactionBy: number[];
  /** A ameaça (turno 3) do adversário mais cedo: quantos turnos teus já jogaste e P(ter interação) */
  firstThreat: { opponentSeat: number; yourTurnsBefore: number; interactionProbability: number } | null;
};

export function globalStep(players: number, seat: number, turn: number): number {
  return (turn - 1) * players + seat;
}

function firstTurnWith(dev: TurnDevelopment[], mana: number, p = 0.5): number | null {
  return dev.find((d) => atLeastMana(d, mana) >= p)?.turn ?? null;
}

export function analyseSeat(profile: DeckProfile, ctx: TableContext, seat: number): SeatAnalysis {
  const seatCtx = { ...ctx, seat };
  const drawsFirstTurn = seat !== 1 || ctx.firstPlayerDraws;
  const base = { N: profile.N, drawFirstTurn: drawsFirstTurn, turns: SEAT_TURNS };
  const development = manaDevelopment({ ...base, lands: profile.lands, ramp: profile.cheapRamp, rampCost: profile.rampCost });
  const reference = manaDevelopment({ ...base, lands: REFERENCE.lands, ramp: REFERENCE.ramp, rampCost: REFERENCE.rampCost });

  const cmv = profile.commanderMv;
  const commander =
    cmv == null
      ? null
      : {
          onCurve: cmv >= 1 && cmv <= SEAT_TURNS ? atLeastMana(development[cmv - 1], cmv) : null,
          typicalTurn: firstTurnWith(development, cmv),
        };

  const interactionAt = (yourTurns: number) =>
    atLeast(profile.N, profile.interaction, yourTurns === 0 ? HAND_SIZE : cardsSeen(seatCtx, yourTurns), 1);

  // Primeira ameaça: turno 3 de cada adversário; fica a que chega mais cedo face aos teus turnos.
  let firstThreat: SeatAnalysis["firstThreat"] = null;
  for (let opp = 1; opp <= ctx.players; opp++) {
    if (opp === seat) continue;
    const g = globalStep(ctx.players, opp, THREAT_TURN);
    let yourTurnsBefore = 0;
    while (globalStep(ctx.players, seat, yourTurnsBefore + 1) < g) yourTurnsBefore++;
    if (!firstThreat || yourTurnsBefore < firstThreat.yourTurnsBefore) {
      firstThreat = { opponentSeat: opp, yourTurnsBefore, interactionProbability: interactionAt(yourTurnsBefore) };
    }
  }

  return {
    seat,
    drawsFirstTurn,
    development,
    reference,
    globalStep: development.map((d) => globalStep(ctx.players, seat, d.turn)),
    fourManaTurn: firstTurnWith(development, 4),
    referenceFourManaTurn: firstTurnWith(reference, 4),
    commander,
    interactionBy: [1, 2, 3, 4].map(interactionAt),
    firstThreat,
  };
}

export function analyseAllSeats(profile: DeckProfile, ctx: TableContext): SeatAnalysis[] {
  return Array.from({ length: ctx.players }, (_, i) => analyseSeat(profile, ctx, i + 1));
}

/** Quantas peças de interação a mais para chegar a `target` de P(≥ 1) com `seen` cartas vistas. */
export function interactionNeeded(N: number, have: number, seen: number, target: number): number | null {
  for (let extra = 0; have + extra <= N; extra++) {
    if (atLeast(N, have + extra, seen, 1) >= target) return extra;
  }
  return null;
}
