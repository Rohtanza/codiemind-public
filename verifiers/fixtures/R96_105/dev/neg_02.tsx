import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';

export function DependencyGraph({ nodes }: { nodes: any[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cy = cytoscape({ container: ref.current, elements: nodes });
    const onResize = () => cy.resize();
    window.addEventListener('resize', onResize);
    return () => {
      cy.destroy();
    };
  }, [nodes]);

  return <div ref={ref} />;
}
