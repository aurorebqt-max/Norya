import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { objectives } from "../data/program";
import { buildPlan } from "../domain/preparation/planner";
import { todayInZone } from "../domain/preparation/dates";
import { createState } from "../domain/preparation/state";
import type { Action } from "../domain/preparation/state";
import type {
  LocalState,
  Plan,
  PreparationProfile,
  WorkInput,
} from "../domain/preparation/types";
import { summarize } from "../domain/preparation/progress";
import { PreparationRepository } from "../services/storage/repository";
import { Button, Card, Txt } from "../components/ui";
import { colors } from "../design/theme";
type Store = {
  state: LocalState;
  profile: PreparationProfile;
  today: string;
  plan: Plan;
  summary: ReturnType<typeof summarize>;
  busy: boolean;
  error: string | null;
  saveProfile: (profile: PreparationProfile) => Promise<void>;
  record: (input: WorkInput) => Promise<void>;
  saveNote: (id: string, text: string) => Promise<void>;
  setNotifications: (value: boolean) => Promise<void>;
};
const Context = createContext<Store | null>(null);
export function PreparationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const repository = useRef(
    new PreparationRepository(AsyncStorage, objectives),
  ).current;
  const [state, setState] = useState<LocalState | null>(null);
  const [instant, setInstant] = useState(() => new Date());
  const [busy, setBusy] = useState(false);
  const pending = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setError(null);
    try {
      setState(
        await repository.load(() => {
          const zone =
            Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris";
          return createState(
            todayInZone(zone),
            "local-" +
              Date.now().toString(36) +
              "-" +
              Math.random().toString(36).slice(2),
            zone,
          );
        }),
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Impossible de lire le stockage local.",
      );
    }
  }, [repository]);
  useEffect(() => {
    void load();
    const timer = setInterval(() => setInstant(new Date()), 30_000);
    const listener = AppState.addEventListener("change", (s) => {
      if (s === "active") setInstant(new Date());
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, [load]);
  const commit = useCallback(
    async (action: Action) => {
      pending.current++;
      setBusy(true);
      setError(null);
      try {
        setState(await repository.commit(action));
        setInstant(new Date());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Enregistrement impossible.");
        throw e;
      } finally {
        pending.current--;
        setBusy(pending.current > 0);
      }
    },
    [repository],
  );
  const today = state ? todayInZone(state.profile.timeZone, instant) : "";
  const plan = useMemo(
    () => (state ? buildPlan(objectives, state, today) : null),
    [state, today],
  );
  const summary = useMemo(
    () => (state ? summarize(objectives, state, today) : null),
    [state, today],
  );
  if (!state || !plan || !summary)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          padding: 24,
          justifyContent: "center",
        }}
      >
        <Card>
          <Txt bold size={24}>
            norya.
          </Txt>
          <Txt>{error ?? "Votre préparation se prépare…"}</Txt>
          {error && (
            <>
              <Txt>
                Vos données n’ont pas été remplacées. Réessayez après avoir
                vérifié l’accès au stockage.
              </Txt>
              <Button
                title="Réessayer le chargement"
                onPress={() => void load()}
              />
            </>
          )}
        </Card>
      </View>
    );
  return (
    <Context.Provider
      value={{
        state,
        profile: state.profile,
        today,
        plan,
        summary,
        busy,
        error,
        saveProfile: (p) => commit({ type: "profile", profile: p }),
        record: (input) =>
          commit({
            type: "work",
            input,
            today: todayInZone(state.profile.timeZone),
          }),
        saveNote: (id, text) => commit({ type: "note", id, text }),
        setNotifications: (value) => commit({ type: "notifications", value }),
      }}
    >
      {error && (
        <View style={{ backgroundColor: colors.peach, padding: 12 }}>
          <Txt size={13}>
            Non enregistré : {error} Vos dernières données sauvegardées sont
            conservées.
          </Txt>
        </View>
      )}
      {children}
    </Context.Provider>
  );
}
export function usePreparation() {
  const store = useContext(Context);
  if (!store) throw new Error("PreparationProvider required");
  return store;
}
