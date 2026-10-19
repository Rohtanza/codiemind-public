import React from "react";

type Props = { initial: number };
type State = { count: number };

export class Counter extends React.Component<Props, State> {
  state: State = { count: this.props.initial };

  increment = () => this.setState((s) => ({ count: s.count + 1 }));
  decrement = () => this.setState((s) => ({ count: s.count - 1 }));

  render() {
    return (
      <div>
        <button onClick={this.decrement}>-</button>
        <span>{this.state.count}</span>
        <button onClick={this.increment}>+</button>
      </div>
    );
  }
}
