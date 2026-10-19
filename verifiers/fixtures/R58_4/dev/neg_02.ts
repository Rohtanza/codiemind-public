export interface Organization {
  id: string;
  name: string;
  memberCount: number;
}

export function largestOrganisation(orgs: Organization[]): Organization | undefined {
  return orgs.reduce<Organization | undefined>(
    (best, org) => (!best || org.memberCount > best.memberCount ? org : best),
    undefined,
  );
}
