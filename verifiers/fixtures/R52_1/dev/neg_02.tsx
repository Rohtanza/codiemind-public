import React from "react";

type Stats = Record<string, number>;

const Badge = ({ text }: { text: string }) => <span className="badge">{text}</span>;

export const Dashboard = ({ stats }: { stats: Stats }) => {
  const fmt = (n: number | undefined) => (n ?? 0).toLocaleString();

  return (
    <main className="dashboard">
      <h1>Overview</h1>
      <Badge text="live" />
      <section className="card">
        <h2>Revenue</h2>
        <p className="value">{fmt(stats.revenue)}</p>
        <p className="hint">Gross revenue this month</p>
      </section>
      <section className="card">
        <h2>Orders</h2>
        <p className="value">{fmt(stats.orders)}</p>
        <p className="hint">Orders placed this month</p>
      </section>
      <section className="card">
        <h2>Refunds</h2>
        <p className="value">{fmt(stats.refunds)}</p>
        <p className="hint">Refunds issued this month</p>
      </section>
      <section className="card">
        <h2>Customers</h2>
        <p className="value">{fmt(stats.customers)}</p>
        <p className="hint">Active customers</p>
      </section>
      <section className="card">
        <h2>New signups</h2>
        <p className="value">{fmt(stats.signups)}</p>
        <p className="hint">Accounts created this month</p>
      </section>
      <section className="card">
        <h2>Churn</h2>
        <p className="value">{fmt(stats.churn)}</p>
        <p className="hint">Accounts cancelled this month</p>
      </section>
      <section className="card">
        <h2>Tickets</h2>
        <p className="value">{fmt(stats.tickets)}</p>
        <p className="hint">Open support tickets</p>
      </section>
      <section className="card">
        <h2>Response time</h2>
        <p className="value">{fmt(stats.responseTime)}</p>
        <p className="hint">Median minutes to first reply</p>
      </section>
      <section className="card">
        <h2>Inventory</h2>
        <p className="value">{fmt(stats.inventory)}</p>
        <p className="hint">Units in stock</p>
      </section>
      <section className="card">
        <h2>Backorders</h2>
        <p className="value">{fmt(stats.backorders)}</p>
        <p className="hint">Units awaiting restock</p>
      </section>
      <section className="card">
        <h2>Shipments</h2>
        <p className="value">{fmt(stats.shipments)}</p>
        <p className="hint">Parcels shipped this month</p>
      </section>
      <section className="card">
        <h2>Returns</h2>
        <p className="value">{fmt(stats.returns)}</p>
        <p className="hint">Parcels returned this month</p>
      </section>
      <section className="card">
        <h2>Visitors</h2>
        <p className="value">{fmt(stats.visitors)}</p>
        <p className="hint">Unique site visitors</p>
      </section>
      <section className="card">
        <h2>Conversion</h2>
        <p className="value">{fmt(stats.conversion)}</p>
        <p className="hint">Visitors who purchased, per mille</p>
      </section>
      <section className="card">
        <h2>Cart abandonment</h2>
        <p className="value">{fmt(stats.abandoned)}</p>
        <p className="hint">Carts left without checkout</p>
      </section>
      <section className="card">
        <h2>Coupons</h2>
        <p className="value">{fmt(stats.coupons)}</p>
        <p className="hint">Coupons redeemed this month</p>
      </section>
      <section className="card">
        <h2>Reviews</h2>
        <p className="value">{fmt(stats.reviews)}</p>
        <p className="hint">Product reviews submitted</p>
      </section>
      <section className="card">
        <h2>Errors</h2>
        <p className="value">{fmt(stats.errors)}</p>
        <p className="hint">Checkout errors logged</p>
      </section>
      <footer>Updated hourly</footer>
    </main>
  );
};
