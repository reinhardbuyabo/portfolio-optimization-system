import {
  users,
  assets,
  portfolioWithAllocations,
  investorProfiles,
} from "@/db/sample-data";

export default function HomePage() {
  // Pick the Investor user from sample-data
  const investor = users.find((u) => u.role === "INVESTOR");
  const investorProfile = investor
    ? investorProfiles(investor.email) // Using email here since no uuid is generated in mocks
    : [];

  const samplePortfolio = portfolioWithAllocations(
    "manager@nse-app.com",
    "SCOM",
    "KEGN",
    "EQTY"
  );

  return (
    <main className="p-6 space-y-8">
      <h1 className="text-3xl font-bold">Investor Dashboard (Sample Data)</h1>

      {/* Investor Info */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Welcome, {investor?.name}</h2>
        <p className="text-muted-foreground">
          Email: {investor?.email} <br />
          Budget: {investorProfile[0]?.budget ?? "N/A"} <br />
          Risk Tolerance: {investorProfile[0]?.riskTolerance ?? "N/A"}
        </p>
      </section>

      {/* Portfolios */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Sample Portfolio</h2>
        <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
          <p className="font-medium">Status: {samplePortfolio.status}</p>
          <h3 className="mt-2 font-semibold">Allocations</h3>
          <ul className="list-disc pl-6">
            {samplePortfolio.allocations.create.map((alloc) => {
              const asset = assets.find((a) => a.ticker === alloc.assetId);
              return (
                <li key={alloc.assetId}>
                  {asset?.name} ({asset?.ticker}):{" "}
                  {(alloc.weight * 100).toFixed(0)}%
                </li>
              );
            })}
          </ul>
          <h3 className="mt-2 font-semibold">Expected Results</h3>
          <ul className="text-sm text-muted-foreground">
            <li>Expected Return: {samplePortfolio.results.create.expectedReturn}</li>
            <li>
              Expected Volatility:{" "}
              {samplePortfolio.results.create.expectedVolatility}
            </li>
            <li>Sharpe Ratio: {samplePortfolio.results.create.sharpeRatio}</li>
            <li>Sortino Ratio: {samplePortfolio.results.create.sortinoRatio}</li>
            <li>Max Drawdown: {samplePortfolio.results.create.maxDrawdown}</li>
          </ul>
        </div>
      </section>

      {/* Assets */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Available Assets</h2>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {assets.map((a) => (
            <li
              key={a.ticker}
              className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm"
            >
              <p className="font-medium">{a.ticker}</p>
              <p className="text-sm text-muted-foreground">{a.name}</p>
              {a.sector && (
                <p className="text-xs text-muted-foreground">Sector: {a.sector}</p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
