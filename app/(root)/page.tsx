import { auth } from "@/auth";
import { getAssets } from "@/lib/actions/assets.actions";
import { getPortfoliosByUser } from "@/lib/actions/portfolios.actions";
import { prisma } from "@/db/prisma";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-bold">Not signed in</h1>
        <p className="text-muted-foreground">
          Please <a href="/sign-in" className="underline">sign in</a> to continue.
        </p>
      </main>
    );
  }

  // Check if user has a passkey - enforce mandatory 2FA
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    include: { authenticators: true },
  });

  if (user) {
    const hasPasskey = user.authenticators && user.authenticators.length > 0;

    if (!hasPasskey) {
      // User doesn't have a passkey, redirect to setup
      redirect("/setup-passkey");
    } else {
      // User has a passkey - check if they've verified it recently
      // If twoFactorVerifiedAt is not set or is older than 2 minutes, require verification
      const needsVerification = !user.twoFactorVerifiedAt ||
        (new Date().getTime() - user.twoFactorVerifiedAt.getTime() > 2 * 60 * 1000);

      if (needsVerification) {
        // Redirect to passkey verification
        redirect("/verify-passkey");
      }
    }
  }

  const investor = session.user;
  const portfolios = await getPortfoliosByUser(investor.id);
  const assets = await getAssets();

  return (
    <main className="p-6 space-y-8">
      <h1 className="text-3xl font-bold">Investor Dashboard</h1>

      {/* Investor Info */}
      <section>
        <h2 className="text-xl font-semibold mb-3">Welcome, {investor.name}</h2>
        <p className="text-muted-foreground">
          Email: {investor.email}
          <br />
          Role: {investor.role}
        </p>
      </section>

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

