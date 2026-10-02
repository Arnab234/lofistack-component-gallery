"use client";

import { useState, type ReactNode } from "react";
import { DemoButton, StageBar } from "@/components/site/controls";
import type { DemoProps } from "@/lib/demos";
import {
  AdCreativePerformance,
  rankCreatives,
  type CreativeCompareDetail,
  type CreativeFormatFilter,
  type CreativeSort,
} from "./AdCreativePerformance";
import { SAMPLE } from "./sample";

const DEFAULT_NOTE: ReactNode = (
  <>
    <b>Example data.</b> Not real client results.
  </>
);

export default function Demo({ embed }: DemoProps) {
  const [sort, setSort] = useState<CreativeSort>("ctr");
  const [format, setFormat] = useState<CreativeFormatFilter>("all");
  const [compare, setCompare] = useState<string[]>([]);
  const [note, setNote] = useState<ReactNode>(DEFAULT_NOTE);

  const say = (strong: string, rest: string) =>
    setNote(
      <>
        <b>{strong}</b> {rest}
      </>
    );

  const onCompare = (d: CreativeCompareDetail) => {
    setCompare(d.ids);
    if (!d.ids.length) return setNote(DEFAULT_NOTE);
    if (d.ids.length === 1) return say(d.creatives[0].name, "picked. Choose one more to compare. Example data.");
    const w = d.creatives.find((c) => c.id === d.winner);
    say("onCompare", `fired. ${w ? `${w.name} leads` : "It's even"}. Example data, not real client results.`);
  };

  return (
    <>
      <AdCreativePerformance
        {...SAMPLE}
        sort={sort}
        format={format}
        compare={compare}
        onCompare={onCompare}
        onSortChange={(d) => {
          setSort(d.sort);
          setFormat(d.format);
          say("onSortChange", `fired: ${d.sort} · ${d.format}. Example data.`);
        }}
      />
      {!embed && (
        <StageBar maxWidth={980} note={<span aria-live="polite">{note}</span>}>
          <DemoButton
            onClick={() => {
              const ids = rankCreatives(SAMPLE.creatives, sort, format).slice(0, 2);
              setCompare(ids);
              const names = ids.map((id) => SAMPLE.creatives.find((c) => c.id === id)?.name).filter(Boolean);
              say("Comparing", `${names.join(" vs ")}. Example data, not real client results.`);
            }}
          >
            Compare top two
          </DemoButton>
          <DemoButton
            onClick={() => {
              setCompare([]);
              setSort("ctr");
              setFormat("all");
              setNote(DEFAULT_NOTE);
            }}
          >
            Reset
          </DemoButton>
        </StageBar>
      )}
    </>
  );
}
