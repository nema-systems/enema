import { BrowserRouter } from "react-router-dom";
import MainRouter from "./routes/main-router";

function App() {
  return (
    <div className="h-dvh w-screen">
      <BrowserRouter future={{ v7_relativeSplatPath: true }}>
        <MainRouter />
      </BrowserRouter>
    </div>
  );
}

export default App;