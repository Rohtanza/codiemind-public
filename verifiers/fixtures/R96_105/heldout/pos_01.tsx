import { useLayoutEffect, useRef } from 'react';
import cytoscape from 'cytoscape';

export function Mindmap({ elements, onPick }: { elements: any[]; onPick: (id: string) => void }) {
  const host = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const instance = cytoscape({ container: host.current!, elements, layout: { name: 'breadthfirst' } });
    const handler = (evt: cytoscape.EventObject) => onPick(evt.target.id());
    instance.on('tap', 'node', handler);
    const onKey = (e: KeyboardEvent) => e.key === 'f' && instance.fit();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      instance.off('tap', 'node', handler);
      instance.destroy();
    };
  }, [elements, onPick]);

  return <div ref={host} />;
}
