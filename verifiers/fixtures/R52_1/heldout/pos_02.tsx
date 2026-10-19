import React from "react";

export default function FeatureMatrix() {
  return (
    <table className="feature-matrix">
      <thead>
        <tr>
          <th>Feature</th>
          <th>Free</th>
          <th>Pro</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Projects</td>
          <td>3</td>
          <td>Unlimited</td>
        </tr>
        <tr>
          <td>Collaborators</td>
          <td>1</td>
          <td>25</td>
        </tr>
        <tr>
          <td>Storage</td>
          <td>1 GB</td>
          <td>100 GB</td>
        </tr>
        <tr>
          <td>Version history</td>
          <td>7 days</td>
          <td>1 year</td>
        </tr>
        <tr>
          <td>Custom domains</td>
          <td>No</td>
          <td>Yes</td>
        </tr>
        <tr>
          <td>Single sign-on</td>
          <td>No</td>
          <td>Yes</td>
        </tr>
        <tr>
          <td>Audit log</td>
          <td>No</td>
          <td>Yes</td>
        </tr>
        <tr>
          <td>API rate limit</td>
          <td>60/min</td>
          <td>600/min</td>
        </tr>
        <tr>
          <td>Webhooks</td>
          <td>2</td>
          <td>50</td>
        </tr>
        <tr>
          <td>Support</td>
          <td>Community</td>
          <td>Email</td>
        </tr>
        <tr>
          <td>Uptime SLA</td>
          <td>None</td>
          <td>99.9%</td>
        </tr>
        <tr>
          <td>Data export</td>
          <td>CSV</td>
          <td>CSV, JSON</td>
        </tr>
        <tr>
          <td>Themes</td>
          <td>Default</td>
          <td>Custom</td>
        </tr>
        <tr>
          <td>Integrations</td>
          <td>5</td>
          <td>All</td>
        </tr>
        <tr>
          <td>Backups</td>
          <td>Weekly</td>
          <td>Daily</td>
        </tr>
        <tr>
          <td>Analytics</td>
          <td>Basic</td>
          <td>Advanced</td>
        </tr>
        <tr>
          <td>Roles</td>
          <td>Owner</td>
          <td>Custom roles</td>
        </tr>
      </tbody>
    </table>
  );
}
