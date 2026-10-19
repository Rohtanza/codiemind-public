import { useEffect, useRef } from 'react';
const Cy = require('cytoscape');

export default function OrgChart({ elements }) {
  const host = useRef(null);

  useEffect(() => {
    const chart = Cy({ container: host.current, elements, layout: { name: 'dagre' } });
    chart.on('mouseover', 'node', (e) => e.target.addClass('hover'));
    return () => {
      chart.removeListener('mouseover');
    };
  }, [elements]);

  return <div ref={host} />;
}
