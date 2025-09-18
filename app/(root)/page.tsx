import { getUsers } from "@/lib/actions/users.actions";
import { getAssets } from "@/lib/actions/assets.actions";
import { getPortfoliosByUser } from "@/lib/actions/portfolios.actions";

export default async function HomePage() {
  const users = await getUsers();
  const investor = users.find((u) => u.role === "INVESTOR");

  // Explicitly type portfolios to avoid implicit 'any[]'
  let portfolios: Awaited<ReturnType<typeof getPortfoliosByUser>> = [];

  if (investor) {
    portfolios = await getPortfoliosByUser(investor.id);
  }

  const assets = await getAssets();

  return (
    <main className="p-6 space-y-8">
      <h1 className="text-3xl font-bold">Investor Dashboard</h1>

      {/* Investor Info */}
      {investor && (
        <section>
          <h2 className="text-xl font-semibold mb-3">
            Welcome, {investor.name}
          </h2>
          <p className="text-muted-foreground">
            Email: {investor.email}
            <br />
            Budget: {investor.investorProfile?.budget ?? "N/A"}
            <br />
            Risk Tolerance: {investor.investorProfile?.riskTolerance ?? "N/A"}
          </p>
        </section>
      )}

      {/* Portfolios */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Your Portfolios</h2>
        {portfolios.length === 0 ? (
          <p className="text-muted-foreground">No portfolios yet.</p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {portfolios.map((p) => (
              <li
                key={p.id}
                className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm"
              >
                <p className="font-medium">Status: {p.status}</p>
                <h3 className="mt-2 font-semibold">Allocations</h3>
                <ul className="list-disc pl-6">
                  {p.allocations.map((alloc) => (
                    <li key={alloc.id}>
                      {alloc.asset?.name} ({alloc.asset?.ticker}):{" "}
                      {(alloc.weight * 100).toFixed(0)}%
                    </li>
                  ))}
                </ul>
                {p.results.length > 0 && (
                  <>
                    <h3 className="mt-2 font-semibold">Expected Results</h3>
                    <ul className="text-sm text-muted-foreground">
                      <li>
                        Expected Return: {p.results[0].expectedReturn.toFixed(2)}
                      </li>
                      <li>
                        Expected Volatility:{" "}
                        {p.results[0].expectedVolatility.toFixed(2)}
                      </li>
                      <li>Sharpe Ratio: {p.results[0].sharpeRatio.toFixed(2)}</li>
                      <li>
                        Sortino Ratio: {p.results[0].sortinoRatio.toFixed(2)}
                      </li>
                      <li>
                        Max Drawdown: {p.results[0].maxDrawdown.toFixed(2)}
                      </li>
                    </ul>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Assets */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Available Assets</h2>
        {assets.length === 0 ? (
          <p className="text-muted-foreground">No assets found.</p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {assets.map((a) => (
              <li
                key={a.id}
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
        )}
      </section>
    </main>
  );
}
