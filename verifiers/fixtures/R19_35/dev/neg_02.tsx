import { useSelector, useDispatch } from 'react-redux';

type RootState = { counter: { value: number } };

export function Counter() {
  const value = useSelector((state: RootState) => state.counter.value);
  const dispatch = useDispatch();
  return (
    <button onClick={() => dispatch({ type: 'counter/increment' })}>
      Count: {value}
    </button>
  );
}
