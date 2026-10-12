// Plain table behind a <details>: the numbers of a chart, readable without colour or hover.
export default function DataTable<T>({ cols, rows }: { cols: [string, (r: T) => string | number][]; rows: T[] }) {
  return (
    <details>
      <summary>données</summary>
      <table>
        <thead><tr>{cols.map(([h]) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{cols.map(([h, f]) => <td key={h}>{f(r)}</td>)}</tr>)}</tbody>
      </table>
    </details>
  );
}
