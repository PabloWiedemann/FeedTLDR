/**
 * Explains the placeholder brief. Renders as a flap tucked under the top
 * edge of the card that follows it: the negative bottom margin pulls that
 * card up over the flap's lower padding, so only the labelled lip shows.
 * Place it as the immediate previous sibling of the summary card, inside a
 * wrapper without vertical gaps.
 */
export function DemoCallout() {
  return (
    <div className="-mb-5 rounded-t-card bg-pastel-blue px-5 pt-3 pb-8 text-pastel-blue-foreground sm:px-8">
      <p className="text-sm text-pretty">
        <strong className="font-medium">This is an example brief.</strong>{" "}
        It was generated from sample X accounts — yours will cover the
        accounts you choose.
      </p>
    </div>
  );
}
