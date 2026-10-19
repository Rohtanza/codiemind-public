import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';

function useCytoscape(containerRef, elements) {
  const cyRef = useRef(null);
  useEffect(() => {
    if (!containerRef.current) return undefined;
    cyRef.current = cytoscape({ container: containerRef.current, elements });
    return function cleanup() {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [containerRef, elements]);
  return cyRef;
}

export default useCytoscape;
