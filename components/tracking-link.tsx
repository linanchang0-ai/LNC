const carrierTrackers: Array<{ names: string[]; url: (trackingNumber: string) => string }> = [
  { names: ["fedex", "fed ex", "联邦快递"], url: (number) => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(number)}` },
  { names: ["ups"], url: (number) => `https://www.ups.com/track?tracknum=${encodeURIComponent(number)}` },
  { names: ["dhl"], url: (number) => `https://www.dhl.com/global-en/home/tracking.html?tracking-id=${encodeURIComponent(number)}` },
  { names: ["usps"], url: (number) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(number)}` },
];

function getTrackingUrl(carrier: string | null, trackingNumber: string) {
  const normalizedCarrier = carrier?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() ?? "";
  const tracker = carrierTrackers.find(({ names }) => names.some((name) => normalizedCarrier.includes(name)));
  if (tracker) return tracker.url(trackingNumber);
  return `https://t.17track.net/en#nums=${encodeURIComponent(trackingNumber)}`;
}

export function TrackingLink({ carrier, trackingNumber }: { carrier: string | null; trackingNumber: string }) {
  return (
    <a href={getTrackingUrl(carrier, trackingNumber)} target="_blank" rel="noopener noreferrer">
      {trackingNumber}
    </a>
  );
}
