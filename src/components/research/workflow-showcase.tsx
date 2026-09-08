"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock, Loader2, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { DOMAINS, LIFE_SCIENCES_VERTICAL, lensForSlug, domainLabel } from "@/lib/domains";
import { iconForDomain } from "@/lib/domain-icons";
import { apiListWorkflows } from "@/lib/workflow-client";
import type { WorkflowDTO } from "@/lib/workflow-types";

/** Synthetic first lens — the catalog's own `popular` flag, not a slug group. */
const POPULAR = "popular";
const LENSES = DOMAINS.filter((d) => d.id !== "all");
const MAX_CARDS = 4;

/**
 * Panel art. Keyed by workflow slug so no two cards repeat — a lens can hold
 * several workflows, and keying by lens made every Pipeline card (and every
 * Clinical card) wear the same illustration.
 *
 * Each panel carries a muted hue that hints at its subject — clinical blue,
 * pipeline sage, regulatory stone, payer wheat, deal bronze — normalised to a
 * common saturation and lightness so the row reads as one set rather than a
 * paintbox. Hues are spread so no two cards sharing a lens tab sit adjacent on
 * the wheel.
 *
 * The value is an art name; files are `/workflows/<name>-bg.webp` plus a
 * `-bg-dark.webp` twin. Slugs absent here fall back to their lens art, so a new
 * workflow always renders something and adding art is a one-line data change.
 */
const WORKFLOW_ART: Record<string, string> = {
  "ls-drug-competitive-landscape": "drug-competitive", // dusty clay
  "ls-pipeline-analysis": "pipeline-analysis", // sage green
  "ls-mechanism-deep-dive": "mechanism", // dusty violet
  "ls-clinical-trial-tracker": "clinical-trial", // soft steel blue
  "ls-kol-mapping": "kol", // muted periwinkle
  "ls-regulatory-pathway": "regulatory-pathway", // cool stone
  "ls-payer-landscape": "payer", // muted wheat
  "ls-bio-ma-screen": "ma-screen", // warm bronze
};

/** Fallback art for a lens, used by workflows with no art of their own. */
const LENS_ART: Record<string, string> = {
  pipeline: "pipeline",
  clinical: "clinical",
  regulatory: "regulatory",
  bd: "bd",
};

const artUrl = (name: string, dark: boolean) =>
  `/workflows/${name}-bg${dark ? "-dark" : ""}.webp`;

/** Art name for a card, preferring the workflow's own over its lens'. */
function artName(slug: string | undefined, lensId: string | undefined) {
  return (
    (slug && WORKFLOW_ART[slug]) || (lensId && LENS_ART[lensId]) || undefined
  );
}

/** Left-weighted washes that keep card text readable over the artwork. */
/*
  A light veil rather than a heavy mask. The art is now near-monochrome and
  already pale, so it needs far less holding back than the tinted set did — this
  lets the illustration span the card the way the finance cards do, while
  keeping the eyebrow and title comfortably readable on the left.
*/
const LIGHT_SCRIM =
  "linear-gradient(to right, rgba(255,255,255,0.80) 0%, rgba(255,255,255,0.62) 45%, rgba(255,255,255,0.30) 100%)";
const DARK_SCRIM =
  "linear-gradient(to right, rgba(10,10,12,0.84) 0%, rgba(10,10,12,0.68) 45%, rgba(10,10,12,0.38) 100%)";

const SKYLINE_BG = "/workflows/skyline-bg.webp";
const SKYLINE_BG_DARK = "/workflows/skyline-bg-dark.webp";

/**
 * Full-bleed wash geometry, shared by the light and dark layers: it breaks out
 * of the section's measure to span the viewport, anchors to the bottom so the
 * skyline band lands behind the cards rather than the empty sky, and is masked
 * on both axes so it dissolves into the page instead of ending on a hard edge.
 */
const WASH_CLASS =
  "pointer-events-none absolute inset-y-0 left-1/2 z-0 w-screen -translate-x-1/2 bg-cover bg-bottom bg-no-repeat " +
  "[mask-image:linear-gradient(to_bottom,transparent,black_26%,black_80%,transparent),linear-gradient(to_right,transparent,black_18%,black_82%,transparent)] [mask-composite:intersect] " +
  "[-webkit-mask-image:linear-gradient(to_bottom,transparent,black_26%,black_80%,transparent),linear-gradient(to_right,transparent,black_18%,black_82%,transparent)] [-webkit-mask-composite:source-in]";

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function CardShell({
  href,
  slug,
  lensId,
  eyebrow,
  title,
  meta,
  index,
}: {
  href: string;
  /** Workflow slug, or undefined for the signed-out lens cards. */
  slug?: string;
  lensId: string | undefined;
  eyebrow: string;
  title: string;
  meta: React.ReactNode;
  index: number;
}) {
  const Icon = iconForDomain(lensId);
  const art = artName(slug, lensId);
  const light = art ? artUrl(art, false) : undefined;
  const dark = art ? artUrl(art, true) : undefined;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 + index * 0.06, duration: 0.45, ease: "easeOut" }}
    >
      <Link
        href={href}
        className="group relative flex h-full min-h-[128px] flex-col justify-between overflow-hidden rounded-2xl border border-stone-200 bg-card p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:border-stone-300 hover:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.12)] dark:border-border"
      >
        {/*
          Both art layers are rendered and toggled with `dark:`, so the right one
          paints on the very first frame — reading the theme in JS would flash the
          light illustration on a hard load in dark mode. The left-weighted scrim
          keeps the eyebrow, title and meta legible over the illustration.
        */}
        {light && (
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-right dark:hidden"
            style={{ backgroundImage: `${LIGHT_SCRIM}, url(${light})` }}
          />
        )}
        {dark && (
          <span
            aria-hidden="true"
            className="absolute inset-0 hidden bg-cover bg-right dark:block"
            style={{ backgroundImage: `${DARK_SCRIM}, url(${dark})` }}
          />
        )}
        <div className="relative flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card/80">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
        </div>
        <div className="relative text-left">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {eyebrow}
          </div>
          {/* Two lines are always reserved so a one-line title doesn't shift its
              card's eyebrow and meta row out of step with its neighbours. */}
          <h3 className="mt-1.5 line-clamp-2 min-h-[2.75em] text-[15px] font-medium leading-snug text-foreground">
            {title}
          </h3>
          <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            {meta}
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/**
 * The homepage's shortcut into Valyu's prebuilt life sciences workflows: a lens
 * filter over the live catalog, four cards deep, with the full browser on
 * /reports. Signed-out visitors can't read the catalog, so the lenses
 * themselves stand in as cards.
 */
export function WorkflowShowcase() {
  const [lens, setLens] = useState<string>(POPULAR);

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ["workflows", LIFE_SCIENCES_VERTICAL],
    queryFn: () => apiListWorkflows(LIFE_SCIENCES_VERTICAL),
    staleTime: 5 * 60 * 1000,
  });

  const shown = useMemo(() => {
    if (lens === POPULAR) {
      const ranked = [...workflows].sort(
        (a, b) => Number(b.popular) - Number(a.popular),
      );
      return ranked.slice(0, MAX_CARDS);
    }
    const slugs = LENSES.find((d) => d.id === lens)?.slugs ?? [];
    return workflows.filter((w) => slugs.includes(w.slug)).slice(0, MAX_CARDS);
  }, [workflows, lens]);

  const cardMeta = (w: WorkflowDTO) => {
    const parts: React.ReactNode[] = [];
    parts.push(
      <span key="mode" className="inline-flex items-center gap-1">
        <Zap className="h-3 w-3 fill-current" strokeWidth={0} />
        {cap(w.recommended_mode)}
      </span>,
    );
    if (w.estimated_time) {
      parts.push(
        <span key="time" className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {w.estimated_time}
        </span>,
      );
    }
    return (
      <>
        {parts.map((part, i) => (
          <span key={i} className="inline-flex items-center gap-1">
            {i > 0 && <span className="text-muted-foreground/60">·</span>}
            {part}
          </span>
        ))}
      </>
    );
  };

  return (
    <section className="relative mx-auto w-full max-w-4xl px-4">
      {/*
        Biomedical research-campus wash behind the workflow band — the finance
        page's cityscape, in life sciences dress. It breaks out of the section's
        measure to run the full viewport width, is anchored to the bottom so the
        skyline band lands behind the cards rather than the sky, and is masked at
        both ends so it dissolves into the page instead of ending on a hard edge.
      */}
      <div
        aria-hidden="true"
        className={`${WASH_CLASS} opacity-80 dark:hidden`}
        style={{ backgroundImage: `url(${SKYLINE_BG})` }}
      />
      <div
        aria-hidden="true"
        className={`${WASH_CLASS} hidden opacity-70 dark:block`}
        style={{ backgroundImage: `url(${SKYLINE_BG_DARK})` }}
      />
      <div className="relative z-10">
        <div className="mb-2 flex items-end justify-between gap-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Life Sciences Workflows
          </h2>
        <Link
          href="/reports"
          className="group inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Browse all
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Lens filter */}
      <div className="mb-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex items-center gap-2">
          {[{ id: POPULAR, label: "Popular", blurb: "Most-run workflows" }, ...LENSES].map(
            (d) => (
              <button
                key={d.id}
                onClick={() => setLens(d.id)}
                title={d.blurb}
                className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                  lens === d.id
                    ? "border-foreground/25 bg-card text-foreground shadow-sm"
                    : "border-border bg-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {d.label}
              </button>
            ),
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading workflows…
        </div>
      ) : shown.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((w, i) => {
            const lensId = lensForSlug(w.slug);
            return (
              <CardShell
                key={w.slug}
                index={i}
                href={`/reports?workflow=${encodeURIComponent(w.slug)}`}
                slug={w.slug}
                lensId={lensId}
                eyebrow={domainLabel(lensId ?? "") ?? "Life Sciences"}
                title={w.title}
                meta={cardMeta(w)}
              />
            );
          })}
        </div>
      ) : (
        // No catalog access (signed out) or an empty lens — offer the lenses.
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {LENSES.map((d, i) => (
            <CardShell
              key={d.id}
              index={i}
              href={`/reports?domain=${d.id}`}
              lensId={d.id}
              eyebrow={d.label}
              title={d.blurb}
              meta={<span>Browse workflows</span>}
            />
          ))}
        </div>
      )}
      </div>
    </section>
  );
}
