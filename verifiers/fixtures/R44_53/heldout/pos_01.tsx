import * as React from "react";

const CodeEditor = React.lazy(() => import("./CodeEditor"));

export function Playground({ source }: { source: string }) {
  return (
    <React.Suspense fallback={<pre>Loading editor…</pre>}>
      <CodeEditor value={source} language="typescript" />
    </React.Suspense>
  );
}
