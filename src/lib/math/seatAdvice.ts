import { pct, num } from "@/lib/format";
import { atLeastMana } from "./development";
import { withinHands } from "./hypergeometric";
import { THREAT_TURN, type DeckProfile, type SeatAnalysis } from "./seats";
import { opponentTurnsBefore, type TableContext } from "./table";

export type SeatAdvice = {
  /** Factos do lugar (números) */
  facts: string[];
  /** Como jogar: sugestões por regras simples a partir dos números */
  howToPlay: string[];
  /** Como o deck reage neste lugar */
  deckReaction: string[];
};

/**
 * Texto para o lugar escolhido. Todas as frases saem de regras fixas sobre
 * os números calculados; nenhuma usa dados que não estejam na página.
 */
export function seatAdvice(
  profile: DeckProfile,
  ctx: TableContext,
  seats: SeatAnalysis[],
  goodHand: number,
): SeatAdvice {
  const s = seats[ctx.seat - 1];
  const P = ctx.players;
  const isFirst = ctx.seat === 1;
  const isLast = ctx.seat === P;
  const facts: string[] = [];
  const howToPlay: string[] = [];
  const deckReaction: string[] = [];

  facts.push(
    `Antes do teu 1.º turno, os adversários jogam ${opponentTurnsBefore(ctx, 1)} ${opponentTurnsBefore(ctx, 1) === 1 ? "turno" : "turnos"}; até ao teu turno 3, ${opponentTurnsBefore(ctx, 3)}.`,
  );
  facts.push(s.drawsFirstTurn ? "Compras no 1.º turno." : "Não compras no 1.º turno: vês menos uma carta do que os outros lugares.");

  // Posição
  if (P === 2) {
    if (isFirst) {
      howToPlay.push(
        "Em 1 vs 1, jogar primeiro é a posição de tempo: és tu quem dita o ritmo. Desenvolve mana e põe ameaças cedo; o adversário é que tem de responder.",
      );
      if (!s.drawsFirstTurn) {
        const other = seats[1];
        howToPlay.push(
          `O custo é a carta a menos: P(jogar terreno em todos os turnos até ao 3) é ${pct(s.development[2].allLandDrops)} contra ${pct(other.development[2].allLandDrops)} no 2.º lugar. Sê mais exigente com mãos de 2 terrenos sem rampa.`,
        );
      }
    } else {
      howToPlay.push(
        "Em 1 vs 1, jogar em segundo dá-te uma carta a mais mas meio turno de atraso: guarda interação para a primeira ameaça do adversário e procura trocas favoráveis antes de acelerar.",
      );
    }
  } else if (isFirst) {
    howToPlay.push(
      "Jogas primeiro: és o primeiro a ter mana e o primeiro a ser visto como ameaça. Usa a vantagem de tempo para te desenvolveres, mas não mostres demasiado cedo: com vários adversários, quem lidera cedo atrai a remoção de todos.",
    );
  } else if (isLast) {
    howToPlay.push(
      `Jogas por último: quando jogas o teu turno 3, a mesa já fez ${opponentTurnsBefore(ctx, 3)} turnos. Vês o que os outros fazem antes de decidir: joga mais reativo cedo, guarda interação para a ameaça que importa e acelera quando a mesa se gastar.`,
    );
  } else {
    howToPlay.push(
      `Jogas em ${ctx.seat}.º: tens ${ctx.seat - 1} ${ctx.seat === 2 ? "adversário" : "adversários"} a jogar antes de ti em cada volta. Equilibra desenvolvimento e resposta: reage ao que os lugares anteriores mostram e desenvolve-te antes dos que jogam depois.`,
    );
  }

  // Interação vs primeira ameaça
  if (s.firstThreat) {
    const t = s.firstThreat;
    const when = t.yourTurnsBefore === 0 ? "antes de jogares o teu 1.º turno" : `quando já jogaste ${t.yourTurnsBefore} ${t.yourTurnsBefore === 1 ? "turno" : "turnos"}`;
    const line = `Se cada adversário jogar a primeira ameaça no seu turno ${THREAT_TURN}, a primeira (do ${t.opponentSeat}.º lugar) chega ${when}; nessa altura tens ${pct(t.interactionProbability)} de ter pelo menos uma peça de interação na mão (${profile.interaction} no deck).`;
    deckReaction.push(line);
    if (t.interactionProbability < 0.6) {
      howToPlay.push(
        `Com só ${pct(t.interactionProbability)} de ter interação a tempo, neste lugar dá prioridade, no mulligan, a mãos com uma peça de remoção ou counter, mesmo que sejam um pouco mais lentas.`,
      );
    }
  }

  // Comandante
  const cmv = profile.commanderMv;
  if (s.commander && cmv != null) {
    const { onCurve, typicalTurn } = s.commander;
    if (onCurve != null && onCurve >= 0.6) {
      howToPlay.push(
        `Podes contar com o comandante no teu turno ${cmv} (${pct(onCurve)}): planeia a curva até lá e protege-o se o deck depender dele.`,
      );
    } else if (typicalTurn != null) {
      howToPlay.push(
        `O comandante (MV ${cmv}) sai a tempo só em ${onCurve != null ? pct(onCurve) : "poucos"} dos jogos; o mais provável é o teu turno ${typicalTurn}. Usa os primeiros turnos para rampa e interação, não para esperar por ele.`,
      );
    }
    if (typicalTurn != null) {
      deckReaction.push(
        `Comandante com 50 % ou mais de mana no teu turno ${typicalTurn} — o momento ${s.globalStep[typicalTurn - 1]} da mesa (${opponentTurnsBefore(ctx, typicalTurn)} turnos de adversários antes).`,
      );
    }
  }

  // Ritmo de mana vs referência
  if (s.fourManaTurn != null) {
    const ref = s.referenceFourManaTurn;
    const cmp =
      ref == null || s.fourManaTurn === ref
        ? "ao mesmo ritmo que"
        : s.fourManaTurn < ref
          ? "mais cedo do que"
          : "mais tarde do que";
    deckReaction.push(
      `Chegas a 4 de mana (com 50 % ou mais) no teu turno ${s.fourManaTurn}, ${cmp} um deck de referência com 36 terrenos e 12 rampas baratas no mesmo lugar${ref != null && ref !== s.fourManaTurn ? ` (turno ${ref})` : ""}.`,
    );
  }
  deckReaction.push(
    `Mana esperada no teu turno 3: ${num(s.development[2].expected)} (referência ${num(s.reference[2].expected)}); turno 5: ${num(s.development[4].expected)} (referência ${num(s.reference[4].expected)}).`,
  );
  deckReaction.push(
    `P(jogar terreno em todos os turnos até ao 4): ${pct(s.development[3].allLandDrops)}; P(ter 5 ou mais de mana no turno 5): ${pct(atLeastMana(s.development[4], 5))}.`,
  );

  // Mulligan
  if (ctx.freeMulligan) {
    howToPlay.push(
      `O 1.º mulligan é grátis: devolve mãos fora do padrão (2–3 terrenos + rampa). A probabilidade de mão boa passa de ${pct(goodHand)} para ${pct(withinHands(goodHand, 2))} sem perderes cartas.`,
    );
  } else {
    howToPlay.push(
      `Sem mulligan grátis, cada mulligan custa uma carta: com ${pct(goodHand)} de mão boa à primeira, fica com mãos jogáveis mesmo que não sejam ideais.`,
    );
  }

  return { facts, howToPlay, deckReaction };
}
