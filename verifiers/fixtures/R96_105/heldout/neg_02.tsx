import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';

export function Topology({ elements }: { elements: any[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cy = cytoscape({ container: ref.current, elements });
    const onScroll = () => cy.resize();
    document.addEventListener('scroll', onScroll, { passive: true });
    const timer = setInterval(() => cy.layout({ name: 'grid' }).run(), 5000);
    return () => {
      clearInterval(timer);
      cy.destroy();
    };
  }, [elements]);

  return <div ref={ref} />;
}
