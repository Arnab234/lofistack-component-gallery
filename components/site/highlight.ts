export type Token = { text: string; kind?: "tag" | "attr" | "str" | "comment" | "kw" | "num" };

const RULES: Array<[RegExp, Token["kind"]]> = [
  [/^\/\/[^\n]*/, "comment"],
  [/^\/\*[\s\S]*?\*\//, "comment"],
  [/^"(?:[^"\\\n]|\\.)*"|^'(?:[^'\\\n]|\\.)*'|^`(?:[^`\\]|\\.)*`/, "str"],
  [/^<\/?[A-Za-z][\w.]*/, "tag"],
  [/^\/?>/, "tag"],
  [/^[A-Za-z_$][\w$-]*(?==)/, "attr"],
  [/^[A-Za-z_$][\w$]*(?=\??:\s)/, "attr"],
  [/^(?:import|from|export|const|let|return|function|type|interface|new|true|false|null|undefined)\b/, "kw"],
  [/^-?\d+(?:\.\d+)?\b/, "num"],
];

/** A tiny TSX tokenizer — enough to colour usage snippets. */
export function highlight(code: string): Token[] {
  const out: Token[] = [];
  let rest = code;
  let plain = "";
  const flush = () => {
    if (plain) out.push({ text: plain });
    plain = "";
  };
  while (rest.length) {
    let matched = false;
    for (const [re, kind] of RULES) {
      const m = re.exec(rest);
      if (m && m[0].length) {
        flush();
        out.push({ text: m[0], kind });
        rest = rest.slice(m[0].length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      // consume a whole word so identifiers are never split mid-way
      const w = /^[A-Za-z_$][\w$]*|^[\s\S]/.exec(rest)![0];
      plain += w;
      rest = rest.slice(w.length);
    }
  }
  flush();
  return out;
}
