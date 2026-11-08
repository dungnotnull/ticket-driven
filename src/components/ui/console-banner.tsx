"use client";

import { useEffect } from "react";

/**
 * Console easter egg on the home page: prints a figlet "Dev by Hoang Dung"
 * banner once. Rendered in a client-only effect so SSR and hydration stay
 * silent and identical. React Strict Mode double-invokes effects in dev,
 * so the banner may appear twice locally (once in production).
 */
const BANNER = " ____               _             _   _                           ____\n|  _ \\  _____   __ | |__  _   _  | | | | ___   __ _ _ __   __ _  |  _ \\ _   _ _ __   __ _\n| | | |/ _ \\ \\ / / | '_ \\| | | | | |_| |/ _ \\ / _` | '_ \\ / _` | | | | | | | | '_ \\ / _` |\n| |_| |  __/\\ V /  | |_) | |_| | |  _  | (_) | (_| | | | | (_| | | |_| | |_| | | | | (_| |\n|____/ \\___| \\_/   |_.__/ \\__, | |_| |_|\\___/ \\__,_|_| |_|\\__, | |____/ \\__,_|_| |_|\\__, |\n                          |___/                           |___/                     |___/";

const STYLE =
  "color:#6366f1;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.25;font-weight:600";

export function ConsoleBanner() {
  useEffect(() => {
    console.log(`%c${BANNER}`, STYLE);
  }, []);
  return null;
}
