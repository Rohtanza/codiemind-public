import React, { useEffect, useMemo, useReducer } from "react";

interface Line {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

interface Props {
  invoiceId: string;
  load: (id: string) => Promise<Line[]>;
  save: (id: string, lines: Line[]) => Promise<void>;
}

type Action =
  | { type: "loaded"; lines: Line[] }
  | { type: "add" }
  | { type: "remove"; id: string }
  | { type: "edit"; id: string; field: keyof Line; value: string };

const InvoiceEditor: React.FC<Props> = ({ invoiceId, load, save }) => {
  const [lines, dispatch] = useReducer((state: Line[], action: Action): Line[] => {
    switch (action.type) {
      case "loaded":
        return action.lines;
      case "add":
        return [
          ...state,
          { id: crypto.randomUUID(), description: "", quantity: 1, price: 0 },
        ];
      case "remove":
        return state.filter((l) => l.id !== action.id);
      case "edit":
        return state.map((l) =>
          l.id === action.id
            ? {
                ...l,
                [action.field]:
                  action.field === "description" ? action.value : Number(action.value),
              }
            : l
        );
      default:
        return state;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    load(invoiceId).then((loaded) => {
      if (!cancelled) {
        dispatch({ type: "loaded", lines: loaded });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [invoiceId, load]);

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity * l.price, 0),
    [lines]
  );
  const tax = subtotal * 0.2;
  const total = subtotal + tax;

  const edit = (id: string, field: keyof Line) => (e: React.ChangeEvent<HTMLInputElement>) =>
    dispatch({ type: "edit", id, field, value: e.target.value });

  return (
    <div className="invoice-editor">
      <h2>Invoice {invoiceId}</h2>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Amount</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id}>
              <td>
                <input value={l.description} onChange={edit(l.id, "description")} />
              </td>
              <td>
                <input type="number" value={l.quantity} onChange={edit(l.id, "quantity")} />
              </td>
              <td>
                <input type="number" value={l.price} onChange={edit(l.id, "price")} />
              </td>
              <td>{(l.quantity * l.price).toFixed(2)}</td>
              <td>
                <button onClick={() => dispatch({ type: "remove", id: l.id })}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={() => dispatch({ type: "add" })}>Add line</button>
      <dl className="totals">
        <dt>Subtotal</dt>
        <dd>{subtotal.toFixed(2)}</dd>
        <dt>Tax</dt>
        <dd>{tax.toFixed(2)}</dd>
        <dt>Total</dt>
        <dd>{total.toFixed(2)}</dd>
      </dl>
      <section className="payment-terms">
        <h3>Payment terms</h3>
        <p>Payment is due within 30 days of the invoice date.</p>
        <p>Late payments accrue interest at 1.5% per month.</p>
        <p>Bank transfers should quote the invoice number.</p>
      </section>
      <section className="notes">
        <h3>Notes</h3>
        <p>Thank you for your business.</p>
      </section>
      <button onClick={() => save(invoiceId, lines)}>Save invoice</button>
    </div>
  );
};

export default InvoiceEditor;
