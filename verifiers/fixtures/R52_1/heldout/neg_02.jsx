import React, { useState } from "react";

const NavLink = ({ href, children }) => <a className="nav-link" href={href}>{children}</a>;

export const SiteNav = function SiteNav({ user }) {
  const [open, setOpen] = useState(null);

  function Group({ id, title, children }) {
    return (
      <li className="nav-group">
        <button onClick={() => setOpen(open === id ? null : id)}>{title}</button>
        {open === id && <ul>{children}</ul>}
      </li>
    );
  }

  return (
    <nav className="site-nav">
      <ul>
        <Group id="products" title="Products">
          <li><NavLink href="/products/editor">Editor</NavLink></li>
          <li><NavLink href="/products/hosting">Hosting</NavLink></li>
          <li><NavLink href="/products/database">Database</NavLink></li>
          <li><NavLink href="/products/storage">Storage</NavLink></li>
          <li><NavLink href="/products/functions">Functions</NavLink></li>
          <li><NavLink href="/products/analytics">Analytics</NavLink></li>
          <li><NavLink href="/products/auth">Authentication</NavLink></li>
          <li><NavLink href="/products/queues">Queues</NavLink></li>
          <li><NavLink href="/products/cron">Cron jobs</NavLink></li>
          <li><NavLink href="/products/cdn">CDN</NavLink></li>
        </Group>
        <Group id="solutions" title="Solutions">
          <li><NavLink href="/solutions/startups">Startups</NavLink></li>
          <li><NavLink href="/solutions/enterprise">Enterprise</NavLink></li>
          <li><NavLink href="/solutions/agencies">Agencies</NavLink></li>
          <li><NavLink href="/solutions/education">Education</NavLink></li>
          <li><NavLink href="/solutions/nonprofits">Nonprofits</NavLink></li>
          <li><NavLink href="/solutions/ecommerce">E-commerce</NavLink></li>
          <li><NavLink href="/solutions/media">Media</NavLink></li>
          <li><NavLink href="/solutions/gaming">Gaming</NavLink></li>
          <li><NavLink href="/solutions/fintech">Fintech</NavLink></li>
          <li><NavLink href="/solutions/health">Healthcare</NavLink></li>
        </Group>
        <Group id="resources" title="Resources">
          <li><NavLink href="/docs">Documentation</NavLink></li>
          <li><NavLink href="/guides">Guides</NavLink></li>
          <li><NavLink href="/blog">Blog</NavLink></li>
          <li><NavLink href="/changelog">Changelog</NavLink></li>
          <li><NavLink href="/templates">Templates</NavLink></li>
          <li><NavLink href="/examples">Examples</NavLink></li>
          <li><NavLink href="/webinars">Webinars</NavLink></li>
          <li><NavLink href="/case-studies">Case studies</NavLink></li>
          <li><NavLink href="/community">Community</NavLink></li>
          <li><NavLink href="/status">Status</NavLink></li>
        </Group>
        <Group id="company" title="Company">
          <li><NavLink href="/about">About</NavLink></li>
          <li><NavLink href="/careers">Careers</NavLink></li>
          <li><NavLink href="/press">Press</NavLink></li>
          <li><NavLink href="/partners">Partners</NavLink></li>
          <li><NavLink href="/investors">Investors</NavLink></li>
          <li><NavLink href="/contact">Contact</NavLink></li>
          <li><NavLink href="/security">Security</NavLink></li>
          <li><NavLink href="/legal/terms">Terms</NavLink></li>
          <li><NavLink href="/legal/privacy">Privacy</NavLink></li>
          <li><NavLink href="/legal/cookies">Cookies</NavLink></li>
        </Group>
        <Group id="pricing" title="Pricing">
          <li><NavLink href="/pricing/free">Free</NavLink></li>
          <li><NavLink href="/pricing/pro">Pro</NavLink></li>
          <li><NavLink href="/pricing/team">Team</NavLink></li>
          <li><NavLink href="/pricing/enterprise">Enterprise</NavLink></li>
          <li><NavLink href="/pricing/compare">Compare plans</NavLink></li>
          <li><NavLink href="/pricing/faq">Pricing FAQ</NavLink></li>
        </Group>
        <Group id="developers" title="Developers">
          <li><NavLink href="/developers/api">API reference</NavLink></li>
          <li><NavLink href="/developers/cli">CLI</NavLink></li>
          <li><NavLink href="/developers/sdks">SDKs</NavLink></li>
          <li><NavLink href="/developers/webhooks">Webhooks</NavLink></li>
          <li><NavLink href="/developers/oauth">OAuth apps</NavLink></li>
          <li><NavLink href="/developers/limits">Rate limits</NavLink></li>
          <li><NavLink href="/developers/errors">Error codes</NavLink></li>
          <li><NavLink href="/developers/sandbox">Sandbox</NavLink></li>
          <li><NavLink href="/developers/samples">Sample apps</NavLink></li>
          <li><NavLink href="/developers/forum">Forum</NavLink></li>
        </Group>
        {user ? (
          <Group id="account" title={user.name}>
            <li><NavLink href="/account">Account</NavLink></li>
            <li><NavLink href="/account/billing">Billing</NavLink></li>
            <li><NavLink href="/account/usage">Usage</NavLink></li>
            <li><NavLink href="/account/tokens">Access tokens</NavLink></li>
            <li><NavLink href="/account/teams">Teams</NavLink></li>
            <li><NavLink href="/account/notifications">Notifications</NavLink></li>
            <li><NavLink href="/logout">Sign out</NavLink></li>
          </Group>
        ) : (
          <>
            <li><NavLink href="/login">Sign in</NavLink></li>
            <li><NavLink href="/signup">Sign up</NavLink></li>
          </>
        )}
      </ul>
    </nav>
  );
};
