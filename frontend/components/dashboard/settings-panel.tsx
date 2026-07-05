"use client";

import type { AppSettings } from "@openforge/shared";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { Card, ErrorState, LoadingSkeleton, PageHeader } from "@/components/common/ui";
import { fetchSettings, updateSettings } from "@/lib/api/settings";

export function SettingsPanel() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings()
      .then((response) => setSettings(response.settings))
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Settings failed to load"));
  }, []);

  async function save(input: Partial<Pick<AppSettings, "displayName" | "theme" | "timezone">> & {
    ai?: Partial<AppSettings["ai"]>;
  }) {
    setStatus("Saving...");
    setError(null);

    try {
      const response = await updateSettings(input);
      setSettings(response.settings);
      setStatus("Saved");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Settings save failed");
      setStatus(null);
    }
  }

  if (!settings) {
    return <LoadingSkeleton rows={3} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Workspace preferences"
        description="Manage display details, GitHub sync visibility, AI provider preferences, and account actions."
      />

      {error ? <ErrorState message={error} /> : null}
      {status ? <Card className="p-4 text-sm text-muted-foreground">{status}</Card> : null}

      <div className="grid gap-4">
        <SettingsSection title="General" description="Display and local preferences.">
          <input
            value={settings.displayName ?? ""}
            onChange={(event) => setSettings({ ...settings, displayName: event.target.value })}
            onBlur={() => void save({ displayName: settings.displayName })}
            placeholder="Display name"
            className="openforge-input w-full"
          />
          <select
            value={settings.theme === "dark" ? "light" : settings.theme}
            onChange={(event) => void save({ theme: event.target.value as AppSettings["theme"] })}
            className="openforge-input w-full"
          >
            <option value="system">System</option>
            <option value="light">Light</option>
          </select>
          <input
            value={settings.timezone}
            onChange={(event) => setSettings({ ...settings, timezone: event.target.value })}
            onBlur={() => void save({ timezone: settings.timezone })}
            className="openforge-input w-full"
          />
        </SettingsSection>

        <SettingsSection title="GitHub sync" description="Connected account and sync status.">
          <div className="rounded-[24px] border border-border bg-background p-4 text-sm">
            <p className="font-medium">{settings.github.connected ? `@${settings.github.username}` : "Not connected"}</p>
            <p className="mt-1 text-muted-foreground">
              Last sync: {settings.github.lastSyncedAt ?? "Not synced"}
            </p>
          </div>
        </SettingsSection>

        <SettingsSection title="AI provider preferences" description="Defaults for future workspace preparation and contribution plans.">
          <select
            value={settings.ai.defaultProvider}
            onChange={(event) =>
              void save({ ai: { defaultProvider: event.target.value as AppSettings["ai"]["defaultProvider"] } })
            }
            className="openforge-input w-full"
          >
            <option value="openai">OpenAI compatible</option>
            <option value="gemini">Gemini</option>
            <option value="groq">Groq</option>
            <option value="ollama">Ollama</option>
          </select>
          <input
            value={settings.ai.preferredModel ?? ""}
            onChange={(event) =>
              setSettings({ ...settings, ai: { ...settings.ai, preferredModel: event.target.value } })
            }
            onBlur={() => void save({ ai: { preferredModel: settings.ai.preferredModel } })}
            placeholder="Preferred model"
            className="openforge-input w-full"
          />
          <select
            value={settings.ai.outputLength}
            onChange={(event) =>
              void save({ ai: { outputLength: event.target.value as AppSettings["ai"]["outputLength"] } })
            }
            className="openforge-input w-full"
          >
            <option value="short">Short</option>
            <option value="balanced">Balanced</option>
            <option value="detailed">Detailed</option>
          </select>
          <select
            value={settings.ai.cachePreference}
            onChange={(event) =>
              void save({ ai: { cachePreference: event.target.value as AppSettings["ai"]["cachePreference"] } })
            }
            className="openforge-input w-full"
          >
            <option value="reuse">Reuse cached results</option>
            <option value="regenerate">Prefer regenerate</option>
          </select>
        </SettingsSection>

        <SettingsSection title="Account" description="Session and account actions.">
          <div className="flex flex-wrap gap-3">
            <LogoutButton />
            <button type="button" className="openforge-button" disabled>
              Delete account
            </button>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}

function SettingsSection({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="grid gap-5 md:grid-cols-[240px_1fr]">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-3">{children}</div>
    </Card>
  );
}

