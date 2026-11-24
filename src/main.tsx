import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowDownUp,
  Building2,
  House,
  Landmark,
  ListChecks,
  Wallet,
} from "lucide-react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
} from "react-router";
import { Accounts } from "./accounts-page";
import { Activities } from "./activities-page";
import { Businesses } from "./businesses-page";
import { Transactions } from "./transactions-page";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const sections = [
  {
    to: "/transactions",
    label: "Transactions",
    icon: ArrowDownUp,
    description: "Record income and expenses by account.",
  },
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
  {
    to: "/activities",
    label: "Activities",
    icon: ListChecks,
    description: "Track activities and their links to businesses.",
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
        <Route path="/activities" element={<Activities />} />
        <Route path="/transactions" element={<Transactions />} />
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
