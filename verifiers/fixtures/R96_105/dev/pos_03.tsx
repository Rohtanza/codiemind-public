import React from 'react';
import cytoscape, { Core } from 'cytoscape';

export class Diagram extends React.Component<{ elements: any[] }> {
  private el = React.createRef<HTMLDivElement>();
  private cy?: Core;

  componentDidMount() {
    this.cy = cytoscape({ container: this.el.current, elements: this.props.elements });
    this.cy.on('select', 'node', () => this.forceUpdate());
  }

  componentWillUnmount() {
    this.cy?.destroy();
  }

  render() {
    return <div ref={this.el} />;
  }
}
