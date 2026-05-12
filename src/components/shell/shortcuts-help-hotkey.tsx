"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Conventional "?" shortcut to open the keyboard-reference page. Only
 * fires when the user is NOT typing in an input / textarea / select /
 * contenteditable — pressing "?" while writing a blog draft should
 * type a question mark, not yank them to /shortcuts.
 *
 * Mounted in the root layout so it's listening on every page.
 */
export function ShortcutsHelpHotkey() {
  const router = useRouter();
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "?") return;
      // Ignore when typing
      const t = e.target;
      if (t instanceof HTMLElement) {
        if (
          t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable
        ) {
          return;
        }
      }
      // Don't fight other modifier combos
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      router.push("/shortcuts");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);
  return null;
}
