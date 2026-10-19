import React from "react";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileDetails } from "./ProfileDetails";
import { ProfileActions } from "./ProfileActions";

type User = { id: string; name: string; email: string; avatarUrl: string };

export function ProfilePage({ user }: { user: User }) {
  return (
    <div className="profile-page">
      <ProfileHeader name={user.name} avatarUrl={user.avatarUrl} />
      <ProfileDetails user={user} />
      <ProfileActions userId={user.id} />
    </div>
  );
}

/*
The previous single-component version, kept for reference during the split:

function ProfilePage({ user }) {
  return (
    <div className="profile-page">
      <header className="profile-header">
        <img src={user.avatarUrl} alt="" />
        <h1>{user.name}</h1>
      </header>
      <dl className="profile-details">
        <dt>Email</dt>
        <dd>{user.email}</dd>
        <dt>Phone</dt>
        <dd>{user.phone}</dd>
        <dt>Company</dt>
        <dd>{user.company}</dd>
        <dt>Job title</dt>
        <dd>{user.jobTitle}</dd>
        <dt>Department</dt>
        <dd>{user.department}</dd>
        <dt>Manager</dt>
        <dd>{user.manager}</dd>
        <dt>Location</dt>
        <dd>{user.location}</dd>
        <dt>Time zone</dt>
        <dd>{user.timeZone}</dd>
        <dt>Language</dt>
        <dd>{user.language}</dd>
        <dt>Website</dt>
        <dd>{user.website}</dd>
        <dt>Twitter</dt>
        <dd>{user.twitter}</dd>
        <dt>GitHub</dt>
        <dd>{user.github}</dd>
        <dt>LinkedIn</dt>
        <dd>{user.linkedin}</dd>
        <dt>Pronouns</dt>
        <dd>{user.pronouns}</dd>
        <dt>Birthday</dt>
        <dd>{user.birthday}</dd>
        <dt>Joined</dt>
        <dd>{user.joined}</dd>
        <dt>Last login</dt>
        <dd>{user.lastLogin}</dd>
        <dt>Plan</dt>
        <dd>{user.plan}</dd>
        <dt>Seats</dt>
        <dd>{user.seats}</dd>
        <dt>Billing email</dt>
        <dd>{user.billingEmail}</dd>
        <dt>Billing address</dt>
        <dd>{user.billingAddress}</dd>
        <dt>Tax ID</dt>
        <dd>{user.taxId}</dd>
        <dt>Invoices</dt>
        <dd>{user.invoiceCount}</dd>
        <dt>Two-factor</dt>
        <dd>{user.twoFactor ? "On" : "Off"}</dd>
        <dt>API access</dt>
        <dd>{user.apiAccess ? "Enabled" : "Disabled"}</dd>
        <dt>Notifications</dt>
        <dd>{user.notifications}</dd>
        <dt>Theme</dt>
        <dd>{user.theme}</dd>
        <dt>Storage used</dt>
        <dd>{user.storageUsed}</dd>
        <dt>Projects</dt>
        <dd>{user.projectCount}</dd>
        <dt>Teams</dt>
        <dd>{user.teamCount}</dd>
        <dt>Status</dt>
        <dd>{user.status}</dd>
        <dt>Region</dt>
        <dd>{user.region}</dd>
        <dt>Referral code</dt>
        <dd>{user.referralCode}</dd>
        <dt>Verified</dt>
        <dd>{user.verified ? "Yes" : "No"}</dd>
        <dt>Locale</dt>
        <dd>{user.locale}</dd>
        <dt>Currency</dt>
        <dd>{user.currency}</dd>
        <dt>Signature</dt>
        <dd>{user.signature}</dd>
      </dl>
      <div className="profile-actions">
        <button onClick={() => editProfile(user.id)}>Edit</button>
        <button onClick={() => resetPassword(user.id)}>Reset password</button>
        <button onClick={() => exportData(user.id)}>Export data</button>
        <button onClick={() => deactivate(user.id)}>Deactivate</button>
      </div>
      <section className="profile-activity">
        <h2>Recent activity</h2>
        <ul>
          {user.activity.map((a) => (
            <li key={a.id}>{a.text}</li>
          ))}
        </ul>
      </section>
      <section className="profile-sessions">
        <h2>Sessions</h2>
        <ul>
          {user.sessions.map((s) => (
            <li key={s.id}>{s.device}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
*/
