import React from "react";

type Props = {
  favouriteColour: string;
  onCentre: () => void;
};

export function FavouriteBadge({ favouriteColour, onCentre }: Props) {
  return (
    <button className="badge centred" onClick={onCentre} title="Centre the view">
      Favourite: {favouriteColour}
    </button>
  );
}
