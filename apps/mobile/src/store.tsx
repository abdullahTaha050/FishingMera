import type { ExperienceLevel, GearProfile, SpeciesId, Spot } from "@mera/types";
import * as Network from "expo-network";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { conditionsMap, getActiveGear, getSetting, listFavorites, listSpots, openDatabase, setFavorite, setSetting, type Database } from "./db";
import { runSync } from "./sync";

interface AppState {
  ready: boolean;
  db: Database | null;
  spots: Spot[];
  favoriteIds: string[];
  gear: GearProfile | null;
  experience: ExperienceLevel;
  targetSpecies: SpeciesId;
  maxDistanceKm: number;
  isConnected: boolean;
  lastSyncAt: string | null;
  reload: () => Promise<void>;
  toggleFavorite: (spotId: string) => Promise<void>;
  updatePreference: (key: "experience" | "target_species" | "max_distance_km", value: string) => Promise<void>;
}

const Context = createContext<AppState | null>(null);

export function AppStateProvider({ children }: React.PropsWithChildren) {
  const [db, setDb] = useState<Database | null>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [gear, setGear] = useState<GearProfile | null>(null);
  const [experience, setExperience] = useState<ExperienceLevel>("BEGINNER");
  const [targetSpecies, setTargetSpecies] = useState<SpeciesId>("ISTAVRIT");
  const [maxDistanceKm, setMaxDistanceKm] = useState(100);
  const [isConnected, setConnected] = useState(true);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!db) return;
    const [nextSpots, nextFavorites, nextGear, nextExperience, nextTarget, nextDistance, sync] = await Promise.all([
      listSpots(db), listFavorites(db), getActiveGear(db), getSetting(db, "experience"), getSetting(db, "target_species"), getSetting(db, "max_distance_km"), getSetting(db, "last_sync_at")
    ]);
    setSpots(nextSpots); setFavoriteIds(nextFavorites); setGear(nextGear);
    if (nextExperience) setExperience(nextExperience as ExperienceLevel);
    if (nextTarget) setTargetSpecies(nextTarget as SpeciesId);
    if (nextDistance) setMaxDistanceKm(Number(nextDistance));
    setLastSyncAt(sync);
  }, [db]);

  useEffect(() => {
    openDatabase().then(setDb).catch((error) => console.error("database_init_failed", error));
    const subscription = Network.addNetworkStateListener((state) => setConnected(Boolean(state.isConnected && state.isInternetReachable !== false)));
    return () => subscription.remove();
  }, []);
  useEffect(() => { if (db) void reload(); }, [db, reload]);
  useEffect(() => {
    if (!db || !isConnected) return;
    void runSync(db).then(() => reload()).catch((error) => console.error("sync_failed", error instanceof Error ? error.name : "unknown"));
  }, [db, isConnected, reload]);

  const toggleFavorite = useCallback(async (spotId: string) => {
    if (!db) return;
    await setFavorite(db, spotId, !favoriteIds.includes(spotId));
    await reload();
  }, [db, favoriteIds, reload]);

  const updatePreference = useCallback(async (key: "experience" | "target_species" | "max_distance_km", value: string) => {
    if (!db) return;
    await setSetting(db, key, value);
    await reload();
  }, [db, reload]);

  const value = useMemo<AppState>(() => ({ ready: Boolean(db), db, spots, favoriteIds, gear, experience, targetSpecies, maxDistanceKm, isConnected, lastSyncAt, reload, toggleFavorite, updatePreference }), [db, spots, favoriteIds, gear, experience, targetSpecies, maxDistanceKm, isConnected, lastSyncAt, reload, toggleFavorite, updatePreference]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAppState(): AppState {
  const value = useContext(Context);
  if (!value) throw new Error("AppStateProvider missing");
  return value;
}

export { conditionsMap };
