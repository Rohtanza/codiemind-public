export type AddressDto = Readonly<{
  street: string;
  city: string;
  postcode: string;
}>;

export function withCity(address: AddressDto, city: string): AddressDto {
  return { ...address, city };
}

const home: AddressDto = { street: '1 Main St', city: 'Leeds', postcode: 'LS1 1AA' };
export const moved = withCity(home, 'York');
