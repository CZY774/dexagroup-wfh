import { MapPin } from 'lucide-react';

type LocationLinkProps = {
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
};

export function LocationLink({ latitude, longitude, accuracyMeters }: LocationLinkProps) {
  if (latitude === null || longitude === null || accuracyMeters === null) {
    return <span className="muted-text">-</span>;
  }

  const roundedAccuracy = Math.round(accuracyMeters);
  const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

  return (
    <a className="location-link" href={mapUrl} target="_blank" rel="noreferrer">
      <MapPin size={16} />
      {roundedAccuracy} m
    </a>
  );
}
