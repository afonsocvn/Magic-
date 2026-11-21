// Só os campos do Scryfall que usamos.

export type ScryfallImageUris = {
  small?: string;
  normal?: string;
  large?: string;
  [size: string]: string | undefined;
};

export type ScryfallFace = {
  name: string;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  colors?: string[];
  image_uris?: ScryfallImageUris;
};

export type ScryfallCard = {
  object: "card";
  id: string;
  oracle_id?: string;
  name: string;
  layout: string;
  mana_cost?: string;
  cmc?: number;
  type_line?: string;
  oracle_text?: string;
  colors?: string[];
  color_identity: string[];
  produced_mana?: string[];
  legalities: Record<string, string>;
  game_changer?: boolean;
  prices?: Record<string, string | null>;
  image_uris?: ScryfallImageUris;
  card_faces?: ScryfallFace[];
  set?: string;
  collector_number?: string;
};

export type BulkDataInfo = {
  object: "bulk_data";
  type: string;
  updated_at: string;
  download_uri?: string;
  jsonl_download_uri?: string;
};

export type CollectionIdentifier =
  | { name: string }
  | { set: string; collector_number: string }
  | { id: string };

export type CollectionResponse = {
  object: "list";
  data: ScryfallCard[];
  not_found: CollectionIdentifier[];
};
