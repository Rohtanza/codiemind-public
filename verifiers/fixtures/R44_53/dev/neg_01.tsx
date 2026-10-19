import { lazy } from "react";

const SettingsForm = lazy(() => import("./SettingsForm"));

export default function SettingsPage() {
  return (
    <div className="container">
      <h2>Settings</h2>
      <SettingsForm />
    </div>
  );
}
