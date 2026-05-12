import { Keyboard } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";

type Shortcut = {
  combo: string[];
  context: string;
  description: string;
};

const SHORTCUTS: Shortcut[] = [
  {
    combo: ["⌘", "K"],
    context: "Anywhere",
    description: "Open the quick-search palette (Cmd / Ctrl + K)",
  },
  {
    combo: ["?"],
    context: "Anywhere",
    description: "Open this keyboard shortcuts reference",
  },
  {
    combo: ["Esc"],
    context: "Modal open",
    description:
      "Close any open modal: tool drawer, confirm dialog, power widget, search palette",
  },
  {
    combo: ["↑", "↓"],
    context: "Search palette",
    description: "Navigate through search results",
  },
  {
    combo: ["Enter"],
    context: "Search palette",
    description: "Open the selected result",
  },
  {
    combo: ["Click + ⌘"],
    context: "Per-client tool sidebar",
    description:
      "Cmd / Ctrl / Shift / middle-click any tool to open in a new browser tab (standalone), instead of in the drawer",
  },
];

export default function ShortcutsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Keyboard shortcuts"
        description="Every binding the app responds to."
        icon={Keyboard}
        accent="violet"
      />

      <section className="glass-apple relative overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead className="border-b border-white/[0.06] bg-white/[0.02] text-left text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-semibold">Shortcut</th>
              <th className="px-5 py-3 font-semibold">Context</th>
              <th className="px-5 py-3 font-semibold">What it does</th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map((s, i) => (
              <tr
                key={i}
                className="border-t border-white/[0.04] hover:bg-white/[0.02]"
              >
                <td className="px-5 py-3">
                  <span className="inline-flex items-center gap-1">
                    {s.combo.map((k, idx) => (
                      <span key={idx} className="flex items-center gap-1">
                        <kbd className="inline-flex items-center justify-center rounded-md bg-white/[0.06] px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground/90 ring-1 ring-inset ring-white/15">
                          {k}
                        </kbd>
                        {idx < s.combo.length - 1 && (
                          <span className="text-muted-foreground/50">+</span>
                        )}
                      </span>
                    ))}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs text-muted-foreground">
                  {s.context}
                </td>
                <td className="px-5 py-3">{s.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="text-xs text-muted-foreground">
        Tip: most platforms use{" "}
        <kbd className="rounded bg-white/[0.06] px-1 text-[10px] ring-1 ring-inset ring-white/15">
          Ctrl
        </kbd>{" "}
        instead of{" "}
        <kbd className="rounded bg-white/[0.06] px-1 text-[10px] ring-1 ring-inset ring-white/15">
          ⌘
        </kbd>{" "}
        — the bindings respond to either.
      </p>
    </div>
  );
}
