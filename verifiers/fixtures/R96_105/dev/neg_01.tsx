import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';

export function Graph({ elements }: { elements: any[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cy = cytoscape({ container: ref.current, elements });
    cy.on('tap', 'node', (e) => console.log(e.target.id()));
    cy.fit();
  }, [elements]);

  return <div ref={ref} style={{ height: 400 }} />;
}
