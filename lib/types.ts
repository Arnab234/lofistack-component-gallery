/** One row of a component's props table. */
export interface PropDoc {
  name: string;
  type: string;
  default?: string;
  required?: boolean;
  description: string;
}

/** Everything the gallery needs to list and document one component. */
export interface ComponentMeta {
  /** URL segment: /components/<slug> */
  slug: string;
  /** Position in the gallery, 1-based. */
  number: number;
  /** Challenge week the component is submitted in. */
  week: number;
  /** Submission type, e.g. "card", "chart", "table", "board". */
  type: string;
  /** Full title shown on the component page. */
  title: string;
  /** Short label used in the top navigation. */
  navLabel: string;
  /** One or two sentences for the homepage card. */
  summary: string;
  /** Intro paragraph on the component page. */
  description: string;
  /** Three short feature tags. */
  tags: string[];
  /** Name of the exported React component. */
  componentName: string;
  /** Typed props, documented. */
  props: PropDoc[];
  /** TSX usage example shown next to the live preview. */
  usage: string;
  /** Optional extra note under the usage example. */
  usageNote?: string;
  /** The final prompt used to build the component. */
  prompt: string;
}
