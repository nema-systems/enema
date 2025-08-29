import { BrowserRouter } from "react-router-dom";
import MainRouter from "./routes/main-router";
import { GlobalFilterProvider } from "./contexts/global-filter-context";

function App() {
  return (
    <div className="h-dvh w-screen">
      <BrowserRouter future={{ v7_relativeSplatPath: true }}>
        <GlobalFilterProvider>
          <MainRouter />
        </GlobalFilterProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;