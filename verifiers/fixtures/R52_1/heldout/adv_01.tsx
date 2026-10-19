import React from "react";

type Release = { version: string; date: string; notes: string[] };

export const ReleaseNotes = ({ releases }: { releases: Release[] }) => {
  const css = `
.release-notes {
  font-family: system-ui, sans-serif;
}
.release-notes h2 {
  margin-top: 2rem;
}
`;

  return (
    <article className="release-notes">
      <style>{css}</style>
      <h1>Release notes</h1>
      <p>Every change shipped to production, newest first.</p>
      <section>
        <h2>Highlights</h2>
        <ul>
          <li>Faster cold starts on all regions</li>
          <li>New dashboard navigation</li>
          <li>Dark mode for the editor</li>
          <li>Granular access tokens</li>
          <li>Audit log export</li>
        </ul>
      </section>
      <section>
        <h2>Breaking changes</h2>
        <ul>
          <li>Node 16 runtime removed</li>
          <li>Legacy webhook signature header dropped</li>
          <li>v1 REST endpoints now return 410</li>
        </ul>
      </section>
      <section>
        <h2>Deprecations</h2>
        <ul>
          <li>The beta CLI flag is ignored</li>
          <li>Project-level API keys will be removed next quarter</li>
          <li>The old billing page redirects to the new one</li>
        </ul>
      </section>
      <section>
        <h2>Fixes</h2>
        <ul>
          <li>Uploads larger than 2 GB no longer stall</li>
          <li>Time zones are respected in scheduled jobs</li>
          <li>Search results no longer duplicate archived items</li>
          <li>Invites expire after seven days as documented</li>
          <li>Copy button works in Safari</li>
          <li>Log viewer keeps scroll position on refresh</li>
          <li>Team rename propagates to invoices</li>
          <li>Password reset links open on mobile</li>
        </ul>
      </section>
      <section>
        <h2>Security</h2>
        <ul>
          <li>Session cookies are now SameSite=Lax by default</li>
          <li>Tokens are hashed at rest</li>
          <li>Login attempts are rate limited per account</li>
        </ul>
      </section>
      <section>
        <h2>Performance</h2>
        <ul>
          <li>Build cache hit rate improved</li>
          <li>Dashboard loads with half the requests</li>
          <li>Database connection pooling enabled by default</li>
          <li>Image optimisation runs at the edge</li>
        </ul>
      </section>
      <section>
        <h2>Documentation</h2>
        <ul>
          <li>New quickstart for monorepos</li>
          <li>Rewritten authentication guide</li>
          <li>Migration guide for the v2 API</li>
        </ul>
      </section>
      <section>
        <h2>All releases</h2>
        {releases.map((r) => (
          <div key={r.version} className="release">
            <h3>
              {r.version} <small>{r.date}</small>
            </h3>
            <ul>
              {r.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>
      <footer>
        <p>Subscribe to the changelog feed to get these by email.</p>
        <a href="/changelog.rss">RSS</a>
      </footer>
    </article>
  );
};
