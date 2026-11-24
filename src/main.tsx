import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowRight,
  Building2,
  House,
  Landmark,
  Plus,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
} from "react-router";
import { accountsResponse } from "./accounts";
import type { Account } from "./accounts";
import { AccountForm } from "./account-form";
import { Businesses } from "./businesses-page";
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
  const client = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [saved, setSaved] = useState("");
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
        <div className="page-actions">
          <button
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            <RefreshCw aria-hidden="true" size={16} />
            {query.isFetching ? "Refreshing…" : "Refresh"}
          </button>
          {!adding && (
            <button
              className="primary-button"
              onClick={() => {
                setSaved("");
                setAdding(true);
              }}
            >
              <Plus aria-hidden="true" size={16} />
              Add account
            </button>
          )}
        </div>
      </div>
      {adding && (
        <AccountForm
          onCancel={() => setAdding(false)}
          onSaved={(account) => {
            setAdding(false);
            setSaved(`${account.name} added.`);
            void client.invalidateQueries({ queryKey: ["accounts"] });
          }}
        />
      )}
      {saved && (
        <p className="save-status" role="status">
          {saved}
        </p>
      )}
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

const sections = [
  {
    to: "/accounts",
    label: "Accounts",
    icon: Landmark,
    description: "Record and view opening balances in MYR and USD.",
  },
  {
    to: "/businesses",
    label: "Businesses",
    icon: Building2,
    description:
      "Keep your business names, start dates and registration references together.",
  },
];

function Home() {
  return (
    <main>
      <div className="page-title">
        <h1>Home</h1>
      </div>
      <ul className="home-links">
        {sections.map(({ to, label, icon: Icon, description }) => (
          <li key={to}>
            <Link to={to}>
              <span className="account-icon">
                <Icon aria-hidden="true" size={20} />
              </span>
              <h2>
                {label} <ArrowRight aria-hidden="true" size={16} />
              </h2>
              <p>{description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

function App() {
  return (
    <div className="app-shell">
      <header className="app-navigation">
        <Link className="brand" to="/">
          <Wallet aria-hidden="true" size={22} />
          My Tax App
        </Link>
        <nav aria-label="Main navigation">
          <NavLink to="/" end>
            <House aria-hidden="true" size={18} />
            Home
          </NavLink>
          {sections.map(({ to, label, icon: Icon }) => (
            <NavLink to={to} key={to}>
              <Icon aria-hidden="true" size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/businesses" element={<Businesses />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </QueryClientProvider>,
);
