type ProfileDto = {
  username: string;
  age: number;
};

export function celebrateBirthday(profile: ProfileDto): ProfileDto {
  profile.age++;
  return profile;
}
