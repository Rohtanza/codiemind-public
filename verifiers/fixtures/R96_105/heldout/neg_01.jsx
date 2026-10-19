import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';

export default function FlowChart({ elements }) {
  const box = useRef(null);
  const cyRef = useRef(null);

  useEffect(() => {
    cyRef.current = cytoscape({ container: box.current, elements });
    return () => {
      cyRef.current.elements().remove();
    };
  }, [elements]);

  return <div ref={box} />;
}
