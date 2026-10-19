import React, { useState, ChangeEvent } from "react";

type Values = Record<string, string>;

export function SettingsForm({ onSave }: { onSave: (v: Values) => void }) {
  const [values, setValues] = useState<Values>({});

  const update = (e: ChangeEvent<HTMLInputElement>) => {
    setValues({ ...values, [e.target.name]: e.target.value });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(values);
      }}
    >
      <label>
        Display name
        <input name="displayName" value={values.displayName ?? ""} onChange={update} />
      </label>
      <label>
        Email
        <input name="email" value={values.email ?? ""} onChange={update} />
      </label>
      <label>
        Phone
        <input name="phone" value={values.phone ?? ""} onChange={update} />
      </label>
      <label>
        Company
        <input name="company" value={values.company ?? ""} onChange={update} />
      </label>
      <label>
        Job title
        <input name="jobTitle" value={values.jobTitle ?? ""} onChange={update} />
      </label>
      <label>
        Street
        <input name="street" value={values.street ?? ""} onChange={update} />
      </label>
      <label>
        City
        <input name="city" value={values.city ?? ""} onChange={update} />
      </label>
      <label>
        State
        <input name="state" value={values.state ?? ""} onChange={update} />
      </label>
      <label>
        Postal code
        <input name="postalCode" value={values.postalCode ?? ""} onChange={update} />
      </label>
      <label>
        Country
        <input name="country" value={values.country ?? ""} onChange={update} />
      </label>
      <label>
        Time zone
        <input name="timeZone" value={values.timeZone ?? ""} onChange={update} />
      </label>
      <label>
        Language
        <input name="language" value={values.language ?? ""} onChange={update} />
      </label>
      <label>
        Website
        <input name="website" value={values.website ?? ""} onChange={update} />
      </label>
      <label>
        Twitter
        <input name="twitter" value={values.twitter ?? ""} onChange={update} />
      </label>
      <label>
        GitHub
        <input name="github" value={values.github ?? ""} onChange={update} />
      </label>
      <label>
        LinkedIn
        <input name="linkedin" value={values.linkedin ?? ""} onChange={update} />
      </label>
      <label>
        Bio
        <input name="bio" value={values.bio ?? ""} onChange={update} />
      </label>
      <label>
        Pronouns
        <input name="pronouns" value={values.pronouns ?? ""} onChange={update} />
      </label>
      <label>
        Birthday
        <input name="birthday" value={values.birthday ?? ""} onChange={update} />
      </label>
      <label>
        Emergency contact
        <input name="emergencyContact" value={values.emergencyContact ?? ""} onChange={update} />
      </label>
      <label>
        Emergency phone
        <input name="emergencyPhone" value={values.emergencyPhone ?? ""} onChange={update} />
      </label>
      <label>
        Department
        <input name="department" value={values.department ?? ""} onChange={update} />
      </label>
      <label>
        Manager
        <input name="manager" value={values.manager ?? ""} onChange={update} />
      </label>
      <button type="submit">Save</button>
    </form>
  );
}
