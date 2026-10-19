import React, { Component } from "react";

export default class Counter extends Component {
  state = { count: 0 };

  increment = () => {
    this.setState((s) => ({ count: s.count + 1 }));
  };

  render() {
    return (
      <div>
        <span>{this.state.count}</span>
        <button onClick={this.increment}>+</button>
      </div>
    );
  }
}
