import { PlayingCard as PlayingCardType } from "@/lib/gameTypes";
import { PlayingCard } from "./playing-card";

// Example usage of the PlayingCard component
export function PlayingCardExample() {
  const exampleCard: PlayingCardType = {
    id: "A_hearts",
    rank: "A",
    suit: "hearts",
  };

  return (
    <div className="p-8 space-y-8">
      <h2 className="text-2xl font-bold">Playing Card Component Examples</h2>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Different Sizes</h3>
        <div className="flex items-center space-x-4">
          <PlayingCard card={exampleCard} size="sm" />
          <PlayingCard card={exampleCard} size="md" />
          <PlayingCard card={exampleCard} size="lg" />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Visibility States</h3>
        <div className="flex items-center space-x-4">
          <div>
            <p className="text-sm mb-2">Visible</p>
            <PlayingCard card={exampleCard} isVisible={true} />
          </div>
          <div>
            <p className="text-sm mb-2">Hidden</p>
            <PlayingCard card={exampleCard} isVisible={false} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Different Suits</h3>
        <div className="flex items-center space-x-4">
          <PlayingCard card={{ id: "A_hearts", rank: "A", suit: "hearts" }} />
          <PlayingCard
            card={{ id: "K_diamonds", rank: "K", suit: "diamonds" }}
          />
          <PlayingCard card={{ id: "Q_clubs", rank: "Q", suit: "clubs" }} />
          <PlayingCard card={{ id: "J_spades", rank: "J", suit: "spades" }} />
        </div>
      </div>
    </div>
  );
}
