import siteJson from './site.json';
import artworksJson from './artworks.json';
import merchJson from './merch.json';
import domHouseJson from './maps/dom-house.json';
import defaultSeasonJson from './seasons/default.json';
import trungThuSeasonJson from './seasons/trung-thu.json';
import tetSeasonJson from './seasons/tet.json';
import type {
  ArtworkCollection,
  MapDefinition,
  MerchItem,
  SeasonConfig,
  SeasonId,
  SiteProfile,
} from '../types/content';

export const siteProfile: SiteProfile = siteJson as SiteProfile;
export const artworkCollections: ArtworkCollection[] = artworksJson as ArtworkCollection[];
export const merchItems: MerchItem[] = merchJson as MerchItem[];
export const domHouseMap: MapDefinition = domHouseJson as MapDefinition;

export const seasons: Record<SeasonId, SeasonConfig> = {
  default: defaultSeasonJson as SeasonConfig,
  'trung-thu': trungThuSeasonJson as SeasonConfig,
  tet: tetSeasonJson as SeasonConfig,
};

export const seasonList: SeasonConfig[] = [
  seasons.default,
  seasons['trung-thu'],
  seasons.tet,
];

/** Active default season — Minigame Seasonal Agent updates this single constant to switch live seasons. */
export const DEFAULT_ACTIVE_SEASON: SeasonId = 'default';

export function getCollectionById(id: string): ArtworkCollection | undefined {
  return artworkCollections.find((c) => c.id === id);
}

export function getMerchById(id: string): MerchItem | undefined {
  return merchItems.find((m) => m.id === id);
}
