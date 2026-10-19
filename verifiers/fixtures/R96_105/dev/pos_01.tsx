import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';

export function Graph({ elements }: { elements: cytoscape.ElementDefinition[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cy = cytoscape({ container: ref.current, elements });
    cy.on('tap', 'node', (e) => console.log(e.target.id()));
    return () => {
      cy.destroy();
    };
  }, [elements]);

  return <div ref={ref} style={{ height: 400 }} />;
}
