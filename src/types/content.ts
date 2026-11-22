export type Locale = 'vi' | 'en';

export interface LocalizedText {
  vi: string;
  en: string;
}

export type ArtworkStatus = 'published' | 'coming_soon';

export interface ArtworkMedia {
  id: string;
  title: LocalizedText;
  /** Optional relative path inside public/ (e.g., "assets/artworks/saigon-tales/com-tam.png"). Falls back to procedural pixel art preview when absent. */
  src?: string;
  /** Key for procedural pixel art renderer when no PNG/GIF has been dropped in yet. */
  proceduralKey: string;
  dimensions?: string;
  caption?: LocalizedText;
  merchId?: string;
}

export interface ArtworkCollection {
  id: string;
  slug: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  year: string;
  category: 'saigon' | 'festival' | 'life' | 'character' | 'game';
  status: ArtworkStatus;
  accentColor: string;
  story: LocalizedText[];
  dateStamp?: string;
  youtubeIds?: string[];
  featuredFrameId?: string;
  items: ArtworkMedia[];
}

export interface MerchItem {
  id: string;
  title: LocalizedText;
  format: LocalizedText;
  specs: LocalizedText[];
  collectionId: string;
  proceduralKey: string;
  src?: string;
  available: boolean;
}

export interface SocialLink {
  id: string;
  label: string;
  handle: string;
  url: string;
  platform: 'instagram' | 'threads' | 'tiktok' | 'facebook' | 'linktree' | 'youtube' | 'email';
}

export interface SiteProfile {
  brandName: string;
  artistName: string;
  realName: string;
  tagline: LocalizedText;
  location: LocalizedText;
  email: string;
  heroGreeting: LocalizedText;
  aboutParagraphs: LocalizedText[];
  contactMessage: LocalizedText;
  socials: SocialLink[];
}

export type Direction = 'down' | 'up' | 'left' | 'right';

export type TileType =
  | 'void'
  | 'grass'
  | 'path'
  | 'porch'
  | 'floor_wood'
  | 'floor_carpet'
  | 'wall_ext'
  | 'wall_ext_top'
  | 'wall_int'
  | 'wall_int_top'
  | 'door_open'
  | 'window_wall';

export interface MapProp {
  id: string;
  kind:
    | 'art_frame'
    | 'easel_desk'
    | 'merch_stall'
    | 'mailbox'
    | 'welcome_sign'
    | 'town_gate'
    | 'lamp_post'
    | 'potted_plant'
    | 'bookshelf'
    | 'tea_table'
    | 'rug_accent'
    | 'tree'
    | 'lantern'
    | 'mai_tree'
    | 'couplet'
    | 'moon_table';
  x: number;
  y: number;
  w?: number;
  h?: number;
  solid?: boolean;
  label?: LocalizedText;
  action?:
    | { type: 'artwork'; collectionId: string }
    | { type: 'merch' }
    | { type: 'about' }
    | { type: 'contact' }
    | { type: 'gallery' }
    | { type: 'dialog'; speaker: LocalizedText; portrait: string; lines: LocalizedText[] };
  accentColor?: string;
}

export interface NpcEntity {
  id: string;
  name: LocalizedText;
  spriteKey: 'dom' | 'ink_cat' | 'task_snake';
  x: number;
  y: number;
  facing: Direction;
  dialogue: LocalizedText[];
  actionButton?: {
    label: LocalizedText;
    actionType: 'about' | 'artwork' | 'gallery' | 'merch' | 'contact';
    collectionId?: string;
  };
}

export interface MapPortal {
  id: string;
  x: number;
  y: number;
  targetMapId: string;
  locked?: boolean;
  label: LocalizedText;
}

export interface MapDefinition {
  id: string;
  name: LocalizedText;
  width: number;
  height: number;
  tileSize: number;
  spawn: { x: number; y: number; facing: Direction };
  tiles: string[];
  props: MapProp[];
  npcs: NpcEntity[];
  portals: MapPortal[];
}

export type SeasonId = 'default' | 'trung-thu' | 'tet';

export interface SeasonConfig {
  id: SeasonId;
  name: LocalizedText;
  badge: LocalizedText;
  description: LocalizedText;
  skyColor: string;
  ambientOverlay: string;
  spotlightColor: string;
  particleType: 'fireflies' | 'lanterns' | 'petals' | 'snow';
  particleCount: number;
  bgmTempo: number;
  extraProps: MapProp[];
  npcDialogueOverrides: Record<string, LocalizedText[]>;
}
