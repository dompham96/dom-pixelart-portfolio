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

export type Facing8 =
  | 'down'
  | 'down_right'
  | 'right'
  | 'up_right'
  | 'up'
  | 'up_left'
  | 'left'
  | 'down_left';

export type TimeOfDayMode = 'auto' | 'morning' | 'sunset' | 'night' | 'late_night';
export type TimePeriod = 'day' | 'sunset' | 'night';
export type CharacterAnimState =
  | 'idle'
  | 'tail_wag'
  | 'sit'
  | 'walk'
  | 'run'
  | 'interact'
  | 'jump'
  | 'sleep'
  | 'work'
  | 'gaming'
  | 'play';
export type SurfaceType = 'grass' | 'stone' | 'wood' | 'carpet';
export type MapZoneId = 'yard' | 'living_gallery' | 'studio_bedroom' | 'kitchen';

export type HairStyle = 'none' | 'short' | 'bob' | 'ponytail' | 'curly' | 'long';
export type OutfitStyle = 'tee' | 'hoodie' | 'overalls' | 'jacket' | 'apron';
export type AccessoryStyle = 'none' | 'cap' | 'beanie' | 'glasses' | 'scarf' | 'headphones' | 'cat_ears';

export interface CharacterAppearance {
  baseTone: string;
  hairStyle: HairStyle;
  hairColor: string;
  outfitStyle: OutfitStyle;
  topColor: string;
  pantsColor: string;
  accessory: AccessoryStyle;
  accessoryColor: string;
}

export type TileType =
  | 'void'
  | 'grass'
  | 'path'
  | 'porch'
  | 'floor_wood'
  | 'floor_carpet'
  | 'floor_kitchen'
  | 'wall_ext'
  | 'wall_ext_top'
  | 'wall_int'
  | 'wall_int_top'
  | 'door_open'
  | 'window_wall';

export interface MapLayers {
  /** Base hand-drawn daytime ground PNG (e.g. "assets/game/maps/dom-house/ground.png") */
  ground?: string;
  /** Optional hand-lit sunset ground PNG — disables synthetic sunset tinting when provided */
  groundSunset?: string;
  /** Optional hand-lit night ground PNG — disables synthetic night darkening when provided */
  groundNight?: string;
  /** Optional overhead layer drawn above characters (roof eaves, canopies, hanging wires) */
  foreground?: string;
  /** Optional hand-painted night light pools / lamp glows on transparent PNG */
  nightOverlay?: string;
}

export interface MapZone {
  id: MapZoneId;
  name: LocalizedText;
  x: number;
  y: number;
  w: number;
  h: number;
  indoor: boolean;
}

export interface MapWaypoint {
  id: string;
  x: number;
  y: number;
  facing?: Direction;
}

export interface MapLight {
  x: number;
  y: number;
  radius: number;
  color?: string;
  flicker?: boolean;
  onlyAtNight?: boolean;
}

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
    | 'moon_table'
    | 'bed'
    | 'gaming_setup'
    | 'behind_scenes_board'
    | 'hobby_shelf'
    | 'kitchen_counter'
    | 'fridge'
    | 'dining_table'
    | 'cat_bed'
    | 'bush';
  x: number;
  y: number;
  w?: number;
  h?: number;
  solid?: boolean;
  /** True when the visual prop is already baked onto ground.png (engine keeps collision + interact badge only) */
  bakedInMap?: boolean;
  /** Optional sprite ID from public/assets/game/sprites/manifest.json for animated Photoshop props */
  spriteId?: string;
  light?: {
    radius: number;
    color?: string;
    flicker?: boolean;
  };
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

export type NpcAiRole = 'static' | 'dom_schedule' | 'cat_companion';

export interface NpcScheduleDialogues {
  sleep?: LocalizedText[];
  work?: LocalizedText[];
  play_cat?: LocalizedText[];
  gaming?: LocalizedText[];
  follow?: LocalizedText[];
}

export interface NpcEntity {
  id: string;
  name: LocalizedText;
  spriteKey: 'dom' | 'ink_cat' | 'task_snake';
  isHumanoid?: boolean;
  appearance?: CharacterAppearance;
  x: number;
  y: number;
  facing: Direction;
  aiRole?: NpcAiRole;
  dialogue: LocalizedText[];
  scheduleDialogues?: NpcScheduleDialogues;
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
  layers?: MapLayers;
  indoorRects?: Array<{ x: number; y: number; w: number; h: number }>;
  zones?: MapZone[];
  waypoints?: MapWaypoint[];
  lights?: MapLight[];
  props: MapProp[];
  npcs: NpcEntity[];
  portals: MapPortal[];
}

export type SeasonId = 'default' | 'trung-thu' | 'tet';

export interface SeasonAudioConfig {
  bgmDay?: string;
  bgmNight?: string;
  ambientDay?: string;
  ambientNight?: string;
}

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
  /** Optional transparent seasonal decoration PNG layered over the map */
  mapOverlay?: string;
  audio?: SeasonAudioConfig;
  extraProps: MapProp[];
  npcDialogueOverrides: Record<string, LocalizedText[]>;
}
