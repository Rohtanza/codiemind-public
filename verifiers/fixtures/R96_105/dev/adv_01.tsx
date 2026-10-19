import { useEffect, useRef } from 'react';
import createGraph from 'cytoscape';

export function Graph({ elements }: { elements: any[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const graph = createGraph({ container: ref.current, elements });
    graph.on('tap', 'node', (e) => console.log(e.target.id()));
    graph.layout({ name: 'cose' }).run();
  }, [elements]);

  return <div ref={ref} />;
}
