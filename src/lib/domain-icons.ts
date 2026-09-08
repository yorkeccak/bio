/**
 * Per-lens glyphs plus a slug→icon helper, shared by the workflow catalog and
 * the reports list so a report shows the same icon as the workflow that
 * produced it. Lucide icons are plain component refs (no JSX) so this stays a
 * .ts module.
 */
import {
  FlaskConical,
  Stethoscope,
  ShieldCheck,
  Handshake,
  LayoutGrid,
  Sparkles,
  Microscope,
  type LucideIcon,
} from "lucide-react";
import { lensForSlug } from "@/lib/domains";

const DOMAIN_ICON: Record<string, LucideIcon> = {
  all: LayoutGrid,
  pipeline: FlaskConical,
  clinical: Stethoscope,
  regulatory: ShieldCheck,
  bd: Handshake,
};

export const iconForDomain = (id: string | undefined): LucideIcon =>
  (id && DOMAIN_ICON[id]) || Microscope;

/** Freeform runs get the sparkle; workflow runs inherit their lens glyph. */
export const iconForSlug = (slug: string): LucideIcon =>
  !slug || slug === "freeform" ? Sparkles : iconForDomain(lensForSlug(slug));
