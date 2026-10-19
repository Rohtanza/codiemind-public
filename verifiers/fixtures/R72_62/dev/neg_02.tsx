import React from "react";

type Props = { label: string };

export class Button extends React.Component<Props> {
  render() {
    return <button type="button">{this.props.label}</button>;
  }
}
