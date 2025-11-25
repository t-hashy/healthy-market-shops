import MarketBoard from "../components/MarketBoard";
import { loadExhibitors } from "../utils/csvLoader";

/**
 * This is the main page of the application.
 * As a Server Component, it fetches data on the server during the build process.
 * The fetched data is then passed as props to the client-side MarketBoard component.
 */
export default async function HomePage() {
  // Load the exhibitor data from the CSV file.
  const exhibitors = await loadExhibitors();

  return (
    // The MarketBoard component receives the data and handles all client-side interactions.
    <MarketBoard exhibitors={exhibitors} />
  );
}
