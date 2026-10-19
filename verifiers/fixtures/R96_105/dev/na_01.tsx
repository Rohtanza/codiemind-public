import { useEffect, useState } from 'react';

// Plain list view; the cytoscape graph lives in a separate page.
export function NodeList({ ids }: { ids: string[] }) {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return <ul style={{ width }}>{ids.map((id) => <li key={id}>{id}</li>)}</ul>;
}
