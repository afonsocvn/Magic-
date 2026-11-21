export type DeckSection = "commander" | "main" | "ignored";

export type DeckEntry = {
  quantity: number;
  name: string;
  set?: string;
  collectorNumber?: string;
  /** Linha original (1-based) para mensagens de erro */
  line: number;
  section: DeckSection;
  /** Nome da secção tal como escrita, ex.: "Sideboard" */
  sectionLabel?: string;
};

export type ParseResult = {
  entries: DeckEntry[];
  /** Linhas que não se conseguiram ler */
  unparsed: { line: number; text: string }[];
  hasCommanderSection: boolean;
};

export type Issue = {
  code: string;
  message: string;
  cards?: string[];
};
