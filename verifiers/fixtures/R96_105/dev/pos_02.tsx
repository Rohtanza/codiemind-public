import { useEffect, useRef } from 'react';
import cytoscape, { Core } from 'cytoscape';

export function NetworkView({ data }: { data: any[] }) {
  const container = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  useEffect(() => {
    const cy = cytoscape({ container: container.current, elements: data });
    cyRef.current = cy;
    const onResize = () => cy.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      cy.removeAllListeners();
      cy.destroy();
      cyRef.current = null;
    };
  }, [data]);

  return <div ref={container} className="network" />;
}
