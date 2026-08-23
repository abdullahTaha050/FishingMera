import type { ExperienceLevel, FishingType, GearProfile, SpeciesId, Spot } from "@mera/types";
import * as Network from "expo-network";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { conditionsMap, getActiveGear, getSetting, listFavorites, listGearProfiles, listSpots, openDatabase, setActiveGear, setFavorite, setSetting, type Database } from "./db";
import { runSync } from "./sync";

interface AppState {
  ready: boolean;
  db: Database | null;
  spots: Spot[];
  favoriteIds: string[];
  gear: GearProfile | null;
  gearProfiles: GearProfile[];
  experience: ExperienceLevel;
  fishingType: FishingType;
  targetSpecies: SpeciesId;
  maxDistanceKm: number;
  isConnected: boolean;
  lastSyncAt: string | null;
  reload: () => Promise<void>;
  toggleFavorite: (spotId: string) => Promise<void>;
  activateGear: (gearId: string) => Promise<void>;
  updatePreference: (key: "experience" | "fishing_type" | "target_species" | "max_distance_km", value: string) => Promise<void>;
}

const Context = createContext<AppState | null>(null);

async function readAppState(db: Database) {
  const [spots, favorites, gear, gearProfiles, experience, fishingType, target, distance, sync] = await Promise.all([
    listSpots(db), listFavorites(db), getActiveGear(db), listGearProfiles(db), getSetting(db, "experience"),
    getSetting(db, "fishing_type"), getSetting(db, "target_species"), getSetting(db, "max_distance_km"), getSetting(db, "last_sync_at")
  ]);
  return { spots, favorites, gear, gearProfiles, experience, fishingType, target, distance, sync };
}

export function AppStateProvider({ children }: React.PropsWithChildren) {
  const [db, setDb] = useState<Database | null>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [gear, setGear] = useState<GearProfile | null>(null);
  const [gearProfiles, setGearProfiles] = useState<GearProfile[]>([]);
  const [experience, setExperience] = useState<ExperienceLevel>("BEGINNER");
  const [fishingType, setFishingType] = useState<FishingType>("SHORE");
  const [targetSpecies, setTargetSpecies] = useState<SpeciesId>("ISTAVRIT");
  const [maxDistanceKm, setMaxDistanceKm] = useState(100);
  const [isConnected, setConnected] = useState(true);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!db) return;
    const next = await readAppState(db);
    setSpots(next.spots); setFavoriteIds(next.favorites); setGear(next.gear); setGearProfiles(next.gearProfiles);
    if (next.experience) setExperience(next.experience as ExperienceLevel);
    if (next.fishingType) setFishingType(next.fishingType as FishingType);
    if (next.target) setTargetSpecies(next.target as SpeciesId);
    if (next.distance) setMaxDistanceKm(Number(next.distance));
    setLastSyncAt(next.sync);
  }, [db]);

  useEffect(() => {
    openDatabase().then(async (openedDb) => {
      const next = await readAppState(openedDb);
      setSpots(next.spots); setFavoriteIds(next.favorites); setGear(next.gear); setGearProfiles(next.gearProfiles);
      if (next.experience) setExperience(next.experience as ExperienceLevel);
      if (next.fishingType) setFishingType(next.fishingType as FishingType);
      if (next.target) setTargetSpecies(next.target as SpeciesId);
      if (next.distance) setMaxDistanceKm(Number(next.distance));
      setLastSyncAt(next.sync);
      setDb(openedDb);
    }).catch((error) => console.error("database_init_failed", error));
    const subscription = Network.addNetworkStateListener((state) => setConnected(Boolean(state.isConnected && state.isInternetReachable !== false)));
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!db || !isConnected) return;
    void runSync(db).then(() => reload()).catch((error) => console.error("sync_failed", error instanceof Error ? error.name : "unknown"));
  }, [db, isConnected, reload]);

  const toggleFavorite = useCallback(async (spotId: string) => {
    if (!db) return;
    await setFavorite(db, spotId, !favoriteIds.includes(spotId));
    await reload();
  }, [db, favoriteIds, reload]);

  const activateGear = useCallback(async (gearId: string) => {
    if (!db) return;
    await setActiveGear(db, gearId);
    await reload();
  }, [db, reload]);

  const updatePreference = useCallback(async (key: "experience" | "fishing_type" | "target_species" | "max_distance_km", value: string) => {
    if (!db) return;
    await setSetting(db, key, value);
    await reload();
  }, [db, reload]);

  const value = useMemo<AppState>(() => ({ ready: Boolean(db), db, spots, favoriteIds, gear, gearProfiles, experience, fishingType, targetSpecies, maxDistanceKm, isConnected, lastSyncAt, reload, toggleFavorite, activateGear, updatePreference }), [db, spots, favoriteIds, gear, gearProfiles, experience, fishingType, targetSpecies, maxDistanceKm, isConnected, lastSyncAt, reload, toggleFavorite, activateGear, updatePreference]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAppState(): AppState {
  const value = useContext(Context);
  if (!value) throw new Error("AppStateProvider missing");
  return value;
}

export { conditionsMap };
