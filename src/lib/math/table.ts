import { atLeast, HAND_SIZE, LIBRARY_SIZE } from "./hypergeometric";

/** Contexto de mesa: nº de jogadores, lugar e regras da casa. */
export type TableContext = {
  players: 2 | 3 | 4;
  /** 1 = joga primeiro */
  seat: number;
  /** Quem joga primeiro compra no 1º turno? */
  firstPlayerDraws: boolean;
  /** O 1º mulligan é grátis? */
  freeMulligan: boolean;
};

/**
 * Por omissão segue as Comprehensive Rules:
 * - 1vs1: quem começa não compra no 1º turno (103.8a) e não há mulligan grátis;
 * - multiplayer: ninguém salta a compra (103.8c) e o 1º mulligan é grátis (103.5c).
 */
export function defaultContext(players: TableContext["players"] = 4, seat = 1): TableContext {
  return {
    players,
    seat: Math.min(Math.max(1, seat), players),
    firstPlayerDraws: players > 2,
    freeMulligan: players > 2,
  };
}

/** Compro no meu 1º turno? */
export function drawsOnFirstTurn(ctx: TableContext): boolean {
  return ctx.seat !== 1 || ctx.firstPlayerDraws;
}

/** Cartas vistas até ao meu turno t (inclusive), sem contar mulligans. */
export function cardsSeen(ctx: TableContext, turn: number): number {
  return HAND_SIZE + (turn - 1) + (drawsOnFirstTurn(ctx) ? 1 : 0);
}

/** Com que mão fico na k-ésima mão (k = 1 é a primeira). */
export function cardsKept(ctx: TableContext, hand: number): number {
  const mulligans = hand - 1;
  const bottom = Math.max(0, mulligans - (ctx.freeMulligan ? 1 : 0));
  return HAND_SIZE - bottom;
}

/** Turnos que os adversários jogam antes do meu turno t. */
export function opponentTurnsBefore(ctx: TableContext, turn: number): number {
  return ctx.seat - 1 + (turn - 1) * (ctx.players - 1);
}

/**
 * P(ter pelo menos t terrenos entre as cartas vistas até ao turno t).
 * Para "jogar terreno em TODOS os turnos até t" usa manaDevelopment (development.ts).
 */
export function landDropProbability(ctx: TableContext, lands: number, turn: number, N = LIBRARY_SIZE): number {
  return atLeast(N, lands, cardsSeen(ctx, turn), turn);
}
