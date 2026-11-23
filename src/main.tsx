import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { Landmark, RefreshCw, Wallet } from "lucide-react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, NavLink, Route, Routes } from "react-router";
import { accountsResponse } from "./accounts";
import type { Account } from "./accounts";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

async function fetchAccounts(signal: AbortSignal) {
  const response = await fetch("/api/accounts", { signal, cache: "no-store" });
  if (response.status === 403)
    throw new Error("Sign in with your approved account to continue.");
  if (!response.ok) throw new Error("Accounts are temporarily unavailable.");
  return accountsResponse.parse(await response.json()).accounts;
}

const accountKinds = {
  business: "Business",
  personal: "Personal",
  deposit: "Fixed deposit",
};

function formatOpeningBalance(account: Account) {
  const amount = BigInt(account.openingBalanceMinor);
  const absolute = amount < 0n ? -amount : amount;
  const units = new Intl.NumberFormat("en-MY").format(absolute / 100n);
  const cents = String(absolute % 100n).padStart(2, "0");
  return `${account.currency} ${amount < 0n ? "−" : ""}${units}.${cents}`;
}

function Accounts() {
  const query = useQuery({
    queryKey: ["accounts"],
    queryFn: ({ signal }) => fetchAccounts(signal),
  });
  const date = new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeZone: "Asia/Kuala_Lumpur",
  });

  return (
    <main>
      <div className="page-title">
        <div>
          <h1>Accounts</h1>
          <p>Opening balances by account and currency.</p>
        </div>
        <button
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          <RefreshCw aria-hidden="true" size={16} />
          {query.isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      {query.isPending && <p role="status">Loading accounts…</p>}
      {query.isError && <p role="alert">{query.error.message}</p>}
      {query.data?.length === 0 && <p>No accounts have been recorded yet.</p>}
      {!!query.data?.length && (
        <ul className="accounts" aria-label="Account opening balances">
          {query.data.map((account) => (
            <li key={account.id}>
              <div className="account-heading">
                <div className="account-icon">
                  <Landmark aria-hidden="true" size={20} />
                </div>
                <span>{accountKinds[account.kind]}</span>
              </div>
              <h2>{account.name}</h2>
              <p className="balance">{formatOpeningBalance(account)}</p>
              <p className="date">
                As of{" "}
                <time dateTime={account.openingBalanceDate}>
                  {date.format(new Date(account.openingBalanceDate))}
                </time>
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function App() {
  return (
    <>
      <header>
        <div className="bar">
          <span className="brand">
            <Wallet aria-hidden="true" size={22} />
            My Tax App
          </span>
          <nav aria-label="Main navigation">
            <NavLink to="/accounts">Accounts</NavLink>
          </nav>
        </div>
      </header>
      <Routes>
        <Route path="/accounts" element={<Accounts />} />
        <Route path="*" element={<Navigate to="/accounts" replace />} />
      </Routes>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </QueryClientProvider>,
);
