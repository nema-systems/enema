import { configureStore } from "@reduxjs/toolkit";
import workspacesReducer from "./workspaces/workspaces.slice";
import requirementsReducer from "./requirements/requirements.slice";
import productsReducer from "./products/products.slice";
import modulesReducer from "./modules/modules.slice";
import parametersReducer from "./parameters/parameters.slice";
import testcasesReducer from "./testcases/testcases.slice";
import assetsReducer from "./assets/assets.slice";

const store = configureStore({
  reducer: {
    workspaces: workspacesReducer,
    requirements: requirementsReducer,
    products: productsReducer,
    modules: modulesReducer,
    parameters: parametersReducer,
    testcases: testcasesReducer,
    assets: assetsReducer,
  },
  devTools: import.meta.env.NODE_ENV !== "production",
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;