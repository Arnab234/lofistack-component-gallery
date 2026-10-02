import type { PropDoc } from "@/lib/types";

export function PropsTable({ props }: { props: PropDoc[] }) {
  return (
    <div className="grid min-w-0 content-start gap-3.5">
      <h2 className="m-0 font-display text-[17px] leading-tight font-semibold tracking-[-0.01em]">Props</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13.5px]">
          <thead className="sr-only">
            <tr>
              <th>Prop</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {props.map((p) => (
              <tr key={p.name} className="border-t border-line first:border-t-0">
                <td className="w-[44%] py-2 pr-4 align-top font-mono text-[12.5px] leading-normal max-sm:w-[48%]">
                  <span className="text-accent">
                    {p.name}
                    {p.required ? "" : "?"}
                  </span>
                  <span className="block text-[11.5px] break-words text-faint">{p.type}</span>
                </td>
                <td className="py-2 align-top text-muted">
                  {p.description}
                  {p.default !== undefined && (
                    <span className="mt-0.5 block font-mono text-[11.5px] text-faint">default: {p.default}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
