import MarketBoard from "../components/MarketBoard";

/**
 * This is the main page of the application.
 * It renders the MarketBoard component, which now fetches its own data from Firestore.
 */
export default function HomePage() {
  return (
    <MarketBoard />
  );
}
