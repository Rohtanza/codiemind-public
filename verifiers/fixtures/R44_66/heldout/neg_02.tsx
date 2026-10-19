import React from "react";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
}

export default class Modal extends React.Component<ModalProps> {
  render() {
    if (!this.props.open) return null;
    return (
      <div role="dialog">
        <button onClick={this.props.onClose}>Close</button>
      </div>
    );
  }
}
